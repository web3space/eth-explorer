'use strict';

var Keypairs = module.exports;
var crypto = require('crypto');

Keypairs._sign = function(opts, payload) {
	return Keypairs._import(opts).then(function(pem) {
		payload = Buffer.from(payload);

		// node specifies RSA-SHAxxx even when it's actually ecdsa (it's all encoded x509 shasums anyway)
		// TODO opts.alg = (protect||header).alg
		var nodeAlg = 'SHA' + Keypairs._getBits(opts);
		var binsig = crypto
			.createSign(nodeAlg)
			.update(payload)
			.sign(pem);

		if ('EC' === opts.jwk.kty && !/x509|asn1/i.test(opts.format)) {
			// ECDSA JWT signatures differ from "normal" ECDSA signatures
			// https://tools.ietf.org/html/rfc7518#section-3.4
			binsig = Keypairs._ecdsaAsn1SigToJoseSig(binsig);
		}

		return binsig;
	});
};

Keypairs._import = function(opts) {
	if (opts.pem && opts.jwk) {
		return Promise.resolve(opts.pem);
	} else {
		// XXX added by caller
		return Keypairs.export({ jwk: opts.jwk });
	}
};

Keypairs._ecdsaAsn1SigToJoseSig = function(binsig) {
	// should have asn1 sequence header of 0x30
	if (0x30 !== binsig[0]) {
		throw new Error('Impossible EC SHA head marker');
	}
	var index = 2; // first ecdsa "R" header byte
	var len = binsig[1];
	var lenlen = 0;
	// Seek length of length if length is greater than 127 (i.e. two 512-bit / 64-byte R and S values)
	if (0x80 & len) {
		lenlen = len - 0x80; // should be exactly 1
		len = binsig[2]; // should be <= 130 (two 64-bit SHA-512s, plus padding)
		index += lenlen;
	}
	// should be of BigInt type
	if (0x02 !== binsig[index]) {
		throw new Error('Impossible EC SHA R marker');
	}
	index += 1;

	var rlen = binsig[index];
	var bits = 32;
	if (rlen > 49) {
		bits = 64;
	} else if (rlen > 33) {
		bits = 48;
	}
	var r = binsig.slice(index + 1, index + 1 + rlen).toString('hex');
	var slen = binsig[index + 1 + rlen + 1]; // skip header and read length
	var s = binsig.slice(index + 1 + rlen + 1 + 1).toString('hex');
	if (2 * slen !== s.length) {
		throw new Error('Impossible EC SHA S length');
	}
	// There may be one byte of padding on either
	while (r.length < 2 * bits) {
		r = '00' + r;
	}
	while (s.length < 2 * bits) {
		s = '00' + s;
	}
	if (2 * (bits + 1) === r.length) {
		r = r.slice(2);
	}
	if (2 * (bits + 1) === s.length) {
		s = s.slice(2);
	}
	return Buffer.concat([Buffer.from(r, 'hex'), Buffer.from(s, 'hex')]);
};
