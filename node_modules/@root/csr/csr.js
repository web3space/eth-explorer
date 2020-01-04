// Copyright 2018-present AJ ONeal. All rights reserved
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';
/*global Promise*/

var Enc = require('@root/encoding');

var ASN1 = require('@root/asn1/packer'); // DER, actually
var Asn1 = ASN1.Any;
var BitStr = ASN1.BitStr;
var UInt = ASN1.UInt;
var Asn1Parser = require('@root/asn1/parser');
var PEM = require('@root/pem');
var X509 = require('@root/x509');
// TODO @root/keypairs/sign
var Keypairs = require('@root/keypairs');

// TODO find a way that the prior node-ish way of `module.exports = function () {}` isn't broken
var CSR = module.exports;

// { jwk, domains }
CSR.csr = function(opts) {
	// We're using a Promise here to be compatible with the browser version
	// which will probably use the webcrypto API for some of the conversions
	return CSR._prepare(opts).then(function(opts) {
		return CSR.create(opts).then(function(bytes) {
			return CSR._encode(opts, bytes);
		});
	});
};

CSR._prepare = function(opts) {
	return Promise.resolve().then(function() {
		opts = JSON.parse(JSON.stringify(opts));

		// We do a bit of extra error checking for user convenience
		if (!opts) {
			throw new Error(
				'You must pass options with key and domains to rsacsr'
			);
		}
		if (!Array.isArray(opts.domains) || 0 === opts.domains.length) {
			new Error('You must pass options.domains as a non-empty array');
		}

		// I need to check that 例.中国 is a valid domain name
		if (
			!opts.domains.every(function(d) {
				// allow punycode? xn--
				if (
					'string' === typeof d /*&& /\./.test(d) && !/--/.test(d)*/
				) {
					return true;
				}
			})
		) {
			throw new Error('You must pass options.domains as strings');
		}

		if (opts.jwk) {
			return opts;
		}
		if (opts.key && opts.key.kty) {
			opts.jwk = opts.key;
			return opts;
		}
		if (!opts.pem && !opts.key) {
			throw new Error('You must pass options.key as a JSON web key');
		}

		return Keypairs.import({ pem: opts.pem || opts.key }).then(function(
			pair
		) {
			opts.jwk = pair.private;
			return opts;
		});
	});
};

CSR._encode = function(opts, bytes) {
	if ('der' === (opts.encoding || '').toLowerCase()) {
		return bytes;
	}
	return PEM.packBlock({
		type: 'CERTIFICATE REQUEST',
		bytes: bytes /* { jwk: jwk, domains: opts.domains } */
	});
};

// { jwk, domains }
CSR.create = function createCsr(opts) {
	var hex = CSR.request({
		jwk: opts.jwk,
		domains: opts.domains,
		encoding: 'hex'
	});
	return CSR._sign(opts.jwk, hex).then(function(csr) {
		return Enc.hexToBuf(csr);
	});
};

//
// EC / RSA
//
// { jwk, domains }
CSR.request = function createCsrBody(opts) {
	var asn1pub;
	if (/^EC/i.test(opts.jwk.kty)) {
		asn1pub = X509.packCsrEcPublicKey(opts.jwk);
	} else {
		asn1pub = X509.packCsrRsaPublicKey(opts.jwk);
	}
	var hex = X509.packCsr(asn1pub, opts.domains);
	if ('hex' === opts.encoding) {
		return hex;
	}
	// der
	return Enc.hexToBuf(hex);
};

CSR._sign = function csrEcSig(jwk, request) {
	// Took some tips from https://gist.github.com/codermapuche/da4f96cdb6d5ff53b7ebc156ec46a10a
	// TODO will have to convert web ECDSA signatures to PEM ECDSA signatures (but RSA should be the same)
	// TODO have a consistent non-private way to sign
	return Keypairs.sign(
		{ jwk: jwk, format: 'x509' },
		Enc.hexToBuf(request)
	).then(function(sig) {
		return CSR._toDer({
			request: request,
			signature: sig,
			kty: jwk.kty
		});
	});
};

CSR._toDer = function encode(opts) {
	var sty;
	if (/^EC/i.test(opts.kty)) {
		// 1.2.840.10045.4.3.2 ecdsaWithSHA256 (ANSI X9.62 ECDSA algorithm with SHA256)
		sty = Asn1('30', Asn1('06', '2a8648ce3d040302'));
	} else {
		// 1.2.840.113549.1.1.11 sha256WithRSAEncryption (PKCS #1)
		sty = Asn1('30', Asn1('06', '2a864886f70d01010b'), Asn1('05'));
	}
	return Asn1(
		'30',
		// The Full CSR Request Body
		opts.request,
		// The Signature Type
		sty,
		// The Signature
		BitStr(Enc.bufToHex(opts.signature))
	);
};

X509.packCsr = function(asn1pubkey, domains) {
	return Asn1(
		'30',
		// Version (0)
		UInt('00'),

		// 2.5.4.3 commonName (X.520 DN component)
		Asn1(
			'30',
			Asn1(
				'31',
				Asn1(
					'30',
					Asn1('06', '550403'),
					// TODO utf8 => punycode
					Asn1('0c', Enc.strToHex(domains[0]))
				)
			)
		),

		// Public Key (RSA or EC)
		asn1pubkey,

		// Request Body
		Asn1(
			'a0',
			Asn1(
				'30',
				// 1.2.840.113549.1.9.14 extensionRequest (PKCS #9 via CRMF)
				Asn1('06', '2a864886f70d01090e'),
				Asn1(
					'31',
					Asn1(
						'30',
						Asn1(
							'30',
							// 2.5.29.17 subjectAltName (X.509 extension)
							Asn1('06', '551d11'),
							Asn1(
								'04',
								Asn1(
									'30',
									domains
										.map(function(d) {
											// TODO utf8 => punycode
											return Asn1('82', Enc.strToHex(d));
										})
										.join('')
								)
							)
						)
					)
				)
			)
		)
	);
};

// TODO finish this later
// we want to parse the domains, the public key, and verify the signature
CSR._info = function(der) {
	// standard base64 PEM
	if ('string' === typeof der && '-' === der[0]) {
		der = PEM.parseBlock(der).bytes;
	}
	// jose urlBase64 not-PEM
	if ('string' === typeof der) {
		der = Enc.base64ToBuf(der);
	}
	// not supporting binary-encoded base64
	var c = Asn1Parser.parse({ der: der, verbose: true, json: false });
	var kty;
	// A cert has 3 parts: cert, signature meta, signature
	if (c.children.length !== 3) {
		throw new Error(
			"doesn't look like a certificate request: expected 3 parts of header"
		);
	}
	var sig = c.children[2];
	if (sig.children.length) {
		// ASN1/X509 EC
		sig = sig.children[0];
		sig = Asn1(
			'30',
			UInt(Enc.bufToHex(sig.children[0].value)),
			UInt(Enc.bufToHex(sig.children[1].value))
		);
		sig = Enc.hexToBuf(sig);
		kty = 'EC';
	} else {
		// Raw RSA Sig
		sig = sig.value;
		kty = 'RSA';
	}
	//c.children[1]; // signature type
	var req = c.children[0];
	if (4 !== req.children.length) {
		throw new Error(
			"doesn't look like a certificate request: expected 4 parts to request"
		);
	}
	// 0 null
	// 1 commonName / subject
	var sub = Enc.bufToStr(
		req.children[1].children[0].children[0].children[1].value
	);
	// 3 public key (type, key)
	//console.log('oid', Enc.bufToHex(req.children[2].children[0].children[0].value));
	var pub;
	// TODO reuse ASN1 parser for these?
	if ('EC' === kty) {
		// throw away compression byte
		pub = req.children[2].children[1].value.slice(1);
		pub = { kty: kty, x: pub.slice(0, 32), y: pub.slice(32) };
		while (0 === pub.x[0]) {
			pub.x = pub.x.slice(1);
		}
		while (0 === pub.y[0]) {
			pub.y = pub.y.slice(1);
		}
		if ((pub.x.length || pub.x.byteLength) > 48) {
			pub.crv = 'P-521';
		} else if ((pub.x.length || pub.x.byteLength) > 32) {
			pub.crv = 'P-384';
		} else {
			pub.crv = 'P-256';
		}
		pub.x = Enc.bufToUrlBase64(pub.x);
		pub.y = Enc.bufToUrlBase64(pub.y);
	} else {
		pub = req.children[2].children[1].children[0];
		pub = {
			kty: kty,
			n: pub.children[0].value,
			e: pub.children[1].value
		};
		while (0 === pub.n[0]) {
			pub.n = pub.n.slice(1);
		}
		while (0 === pub.e[0]) {
			pub.e = pub.e.slice(1);
		}
		pub.n = Enc.bufToUrlBase64(pub.n);
		pub.e = Enc.bufToUrlBase64(pub.e);
	}
	// 4 extensions
	var domains = req.children[3].children
		.filter(function(seq) {
			//  1.2.840.113549.1.9.14 extensionRequest (PKCS #9 via CRMF)
			if ('2a864886f70d01090e' === Enc.bufToHex(seq.children[0].value)) {
				return true;
			}
		})
		.map(function(seq) {
			return seq.children[1].children[0].children
				.filter(function(seq2) {
					// subjectAltName (X.509 extension)
					if ('551d11' === Enc.bufToHex(seq2.children[0].value)) {
						return true;
					}
				})
				.map(function(seq2) {
					return seq2.children[1].children[0].children.map(function(
						name
					) {
						// TODO utf8 => punycode
						return Enc.bufToStr(name.value);
					});
				})[0];
		})[0];

	return {
		subject: sub,
		altnames: domains,
		jwk: pub,
		signature: sig
	};
};
