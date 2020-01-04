'use strict';

var Keypairs = module.exports;

Keypairs._sign = function(opts, payload) {
	return Keypairs._import(opts).then(function(privkey) {
		if ('string' === typeof payload) {
			payload = new TextEncoder().encode(payload);
		}

		return window.crypto.subtle
			.sign(
				{
					name: Keypairs._getName(opts),
					hash: { name: 'SHA-' + Keypairs._getBits(opts) }
				},
				privkey,
				payload
			)
			.then(function(signature) {
				signature = new Uint8Array(signature); // ArrayBuffer -> u8
				// This will come back into play for CSRs, but not for JOSE
				if ('EC' === opts.jwk.kty && /x509|asn1/i.test(opts.format)) {
					return Keypairs._ecdsaJoseSigToAsn1Sig(signature);
				} else {
					// jose/jws/jwt
					return signature;
				}
			});
	});
};

Keypairs._import = function(opts) {
	return Promise.resolve().then(function() {
		var ops;
		// all private keys just happen to have a 'd'
		if (opts.jwk.d) {
			ops = ['sign'];
		} else {
			ops = ['verify'];
		}
		// gotta mark it as extractable, as if it matters
		opts.jwk.ext = true;
		opts.jwk.key_ops = ops;

		return window.crypto.subtle
			.importKey(
				'jwk',
				opts.jwk,
				{
					name: Keypairs._getName(opts),
					namedCurve: opts.jwk.crv,
					hash: { name: 'SHA-' + Keypairs._getBits(opts) }
				},
				true,
				ops
			)
			.then(function(privkey) {
				delete opts.jwk.ext;
				return privkey;
			});
	});
};

// ECDSA JOSE / JWS / JWT signatures differ from "normal" ASN1/X509 ECDSA signatures
// https://tools.ietf.org/html/rfc7518#section-3.4
Keypairs._ecdsaJoseSigToAsn1Sig = function(bufsig) {
	// it's easier to do the manipulation in the browser with an array
	bufsig = Array.from(bufsig);
	var hlen = bufsig.length / 2; // should be even
	var r = bufsig.slice(0, hlen);
	var s = bufsig.slice(hlen);
	// unpad positive ints less than 32 bytes wide
	while (!r[0]) {
		r = r.slice(1);
	}
	while (!s[0]) {
		s = s.slice(1);
	}
	// pad (or re-pad) ambiguously non-negative BigInts, up to 33 bytes wide
	if (0x80 & r[0]) {
		r.unshift(0);
	}
	if (0x80 & s[0]) {
		s.unshift(0);
	}

	var len = 2 + r.length + 2 + s.length;
	var head = [0x30];
	// hard code 0x80 + 1 because it won't be longer than
	// two SHA512 plus two pad bytes (130 bytes <= 256)
	if (len >= 0x80) {
		head.push(0x81);
	}
	head.push(len);

	return Uint8Array.from(
		head.concat([0x02, r.length], r, [0x02, s.length], s)
	);
};

Keypairs._getName = function(opts) {
	if (/EC/i.test(opts.jwk.kty)) {
		return 'ECDSA';
	} else {
		return 'RSASSA-PKCS1-v1_5';
	}
};
