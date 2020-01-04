// Copyright 2016-2018 AJ ONeal. All rights reserved
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

module.exports = function(bitlen, exp) {
	var k = require('node-forge').pki.rsa.generateKeyPair({
		bits: bitlen || 2048,
		e: exp || 0x10001
	}).privateKey;
	var jwk = {
		kty: 'RSA',
		n: _toUrlBase64(k.n),
		e: _toUrlBase64(k.e),
		d: _toUrlBase64(k.d),
		p: _toUrlBase64(k.p),
		q: _toUrlBase64(k.q),
		dp: _toUrlBase64(k.dP),
		dq: _toUrlBase64(k.dQ),
		qi: _toUrlBase64(k.qInv)
	};
	return {
		private: jwk,
		public: {
			kty: jwk.kty,
			n: jwk.n,
			e: jwk.e
		}
	};
};

function _toUrlBase64(fbn) {
	var hex = fbn.toRadix(16);
	if (hex.length % 2) {
		// Invalid hex string
		hex = '0' + hex;
	}
	while ('00' === hex.slice(0, 2)) {
		hex = hex.slice(2);
	}
	return Buffer.from(hex, 'hex')
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

if (require.main === module) {
	var keypair = module.exports(2048, 0x10001);
	console.info(keypair.private);
	console.warn(keypair.public);
	//console.info(keypair.privateKeyJwk);
	//console.warn(keypair.publicKeyJwk);
}
