/*global Promise*/
'use strict';

var Enc = require('@root/encoding');

var EC = module.exports;
var native = require('./lib/node/ecdsa.js');

// TODO SSH
var SSH;

var X509 = require('@root/x509');
var PEM = require('@root/pem');
//var SSH = require('./ssh-keys.js');
var sha2 = require('./lib/node/sha2.js');

// 1.2.840.10045.3.1.7
// prime256v1 (ANSI X9.62 named elliptic curve)
var OBJ_ID_EC = '06 08 2A8648CE3D030107'.replace(/\s+/g, '').toLowerCase();
// 1.3.132.0.34
// secp384r1 (SECG (Certicom) named elliptic curve)
var OBJ_ID_EC_384 = '06 05 2B81040022'.replace(/\s+/g, '').toLowerCase();

EC._stance =
	"We take the stance that if you're knowledgeable enough to" +
	" properly and securely use non-standard crypto then you shouldn't need Bluecrypt anyway.";
native._stance = EC._stance;
EC._universal =
	'Bluecrypt only supports crypto with standard cross-browser and cross-platform support.';
EC.generate = native.generate;

EC.export = function(opts) {
	return Promise.resolve().then(function() {
		if (!opts || !opts.jwk || 'object' !== typeof opts.jwk) {
			throw new Error('must pass { jwk: jwk } as a JSON object');
		}
		var jwk = JSON.parse(JSON.stringify(opts.jwk));
		var format = opts.format;
		if (
			opts.public ||
			-1 !== ['spki', 'pkix', 'ssh', 'rfc4716'].indexOf(format)
		) {
			jwk.d = null;
		}
		if ('EC' !== jwk.kty) {
			throw new Error("options.jwk.kty must be 'EC' for EC keys");
		}
		if (!jwk.d) {
			if (!format || -1 !== ['spki', 'pkix'].indexOf(format)) {
				format = 'spki';
			} else if (-1 !== ['ssh', 'rfc4716'].indexOf(format)) {
				format = 'ssh';
			} else {
				throw new Error(
					"options.format must be 'spki' or 'ssh' for public EC keys, not (" +
						typeof format +
						') ' +
						format
				);
			}
		} else {
			if (!format || 'sec1' === format) {
				format = 'sec1';
			} else if ('pkcs8' !== format) {
				throw new Error(
					"options.format must be 'sec1' or 'pkcs8' for private EC keys, not '" +
						format +
						"'"
				);
			}
		}
		if (-1 === ['P-256', 'P-384'].indexOf(jwk.crv)) {
			throw new Error(
				"options.jwk.crv must be either P-256 or P-384 for EC keys, not '" +
					jwk.crv +
					"'"
			);
		}
		if (!jwk.y) {
			throw new Error(
				'options.jwk.y must be a urlsafe base64-encoded either P-256 or P-384'
			);
		}

		if ('sec1' === format) {
			return PEM.packBlock({
				type: 'EC PRIVATE KEY',
				bytes: X509.packSec1(jwk)
			});
		} else if ('pkcs8' === format) {
			return PEM.packBlock({
				type: 'PRIVATE KEY',
				bytes: X509.packPkcs8(jwk)
			});
		} else if (-1 !== ['spki', 'pkix'].indexOf(format)) {
			return PEM.packBlock({
				type: 'PUBLIC KEY',
				bytes: X509.packSpki(jwk)
			});
		} else if (-1 !== ['ssh', 'rfc4716'].indexOf(format)) {
			return SSH.packSsh(jwk);
		} else {
			throw new Error(
				'Sanity Error: reached unreachable code block with format: ' +
					format
			);
		}
	});
};
native.export = EC.export;

EC.import = function(opts) {
	return Promise.resolve().then(function() {
		if (!opts || !opts.pem || 'string' !== typeof opts.pem) {
			throw new Error('must pass { pem: pem } as a string');
		}
		if (0 === opts.pem.indexOf('ecdsa-sha2-')) {
			//return SSH.parseSsh(opts.pem);
			throw new Error('SSH not yet re-supported');
		}
		var pem = opts.pem;
		var u8 = PEM.parseBlock(pem).bytes;
		var hex = Enc.bufToHex(u8);
		var jwk = { kty: 'EC', crv: null, x: null, y: null };

		//console.log();
		if (
			-1 !== hex.indexOf(OBJ_ID_EC) ||
			-1 !== hex.indexOf(OBJ_ID_EC_384)
		) {
			if (-1 !== hex.indexOf(OBJ_ID_EC_384)) {
				jwk.crv = 'P-384';
			} else {
				jwk.crv = 'P-256';
			}

			// PKCS8
			if (0x02 === u8[3] && 0x30 === u8[6] && 0x06 === u8[8]) {
				//console.log("PKCS8", u8[3].toString(16), u8[6].toString(16), u8[8].toString(16));
				jwk = X509.parsePkcs8(u8, jwk);
				// EC-only
			} else if (0x02 === u8[2] && 0x04 === u8[5] && 0xa0 === u8[39]) {
				//console.log("EC---", u8[2].toString(16), u8[5].toString(16), u8[39].toString(16));
				jwk = X509.parseSec1(u8, jwk);
				// EC-only
			} else if (0x02 === u8[3] && 0x04 === u8[6] && 0xa0 === u8[56]) {
				//console.log("EC---", u8[3].toString(16), u8[6].toString(16), u8[56].toString(16));
				jwk = X509.parseSec1(u8, jwk);
				// SPKI/PKIK (Public)
			} else if (0x30 === u8[2] && 0x06 === u8[4] && 0x06 === u8[13]) {
				//console.log("SPKI-", u8[2].toString(16), u8[4].toString(16), u8[13].toString(16));
				jwk = X509.parseSpki(u8, jwk);
				// Error
			} else {
				//console.log("PKCS8", u8[3].toString(16), u8[6].toString(16), u8[8].toString(16));
				//console.log("EC---", u8[2].toString(16), u8[5].toString(16), u8[39].toString(16));
				//console.log("EC---", u8[3].toString(16), u8[6].toString(16), u8[56].toString(16));
				//console.log("SPKI-", u8[2].toString(16), u8[4].toString(16), u8[13].toString(16));
				throw new Error('unrecognized key format');
			}
		} else {
			throw new Error('Supported key types are P-256 and P-384');
		}
		if (opts.public) {
			if (true !== opts.public) {
				throw new Error(
					'options.public must be either `true` or `false` not (' +
						typeof opts.public +
						") '" +
						opts.public +
						"'"
				);
			}
			delete jwk.d;
		}
		return jwk;
	});
};
native.import = EC.import;

EC.pack = function(opts) {
	return Promise.resolve().then(function() {
		return EC.export(opts);
	});
};

// Chopping off the private parts is now part of the public API.
// I thought it sounded a little too crude at first, but it really is the best name in every possible way.
EC.neuter = function(opts) {
	// trying to find the best balance of an immutable copy with custom attributes
	var jwk = {};
	Object.keys(opts.jwk).forEach(function(k) {
		if ('undefined' === typeof opts.jwk[k]) {
			return;
		}
		// ignore EC private parts
		if ('d' === k) {
			return;
		}
		jwk[k] = JSON.parse(JSON.stringify(opts.jwk[k]));
	});
	return jwk;
};
native.neuter = EC.neuter;

// https://stackoverflow.com/questions/42588786/how-to-fingerprint-a-jwk
EC.__thumbprint = function(jwk) {
	// Use the same entropy for SHA as for key
	var alg = 'SHA-256';
	if (/384/.test(jwk.crv)) {
		alg = 'SHA-384';
	}
	var payload =
		'{"crv":"' +
		jwk.crv +
		'","kty":"EC","x":"' +
		jwk.x +
		'","y":"' +
		jwk.y +
		'"}';
	return sha2.sum(alg, payload).then(function(hash) {
		return Enc.bufToUrlBase64(Uint8Array.from(hash));
	});
};

EC.thumbprint = function(opts) {
	return Promise.resolve().then(function() {
		var jwk;
		if ('EC' === opts.kty) {
			jwk = opts;
		} else if (opts.jwk) {
			jwk = opts.jwk;
		} else {
			return native.import(opts).then(function(jwk) {
				return EC.__thumbprint(jwk);
			});
		}
		return EC.__thumbprint(jwk);
	});
};
