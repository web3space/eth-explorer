// Copyright 2016-2018 AJ ONeal. All rights reserved
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

var oldver = false;

module.exports = function(bitlen, exp) {
	bitlen = parseInt(bitlen, 10) || 2048;
	exp = parseInt(exp, 10) || 65537;

	try {
		return require('./generate-privkey-node.js')(bitlen, exp);
	} catch (e) {
		if (!/generateKeyPairSync is not a function/.test(e.message)) {
			throw e;
		}
		try {
			return require('./generate-privkey-ursa.js')(bitlen, exp);
		} catch (e) {
			if (e.code !== 'MODULE_NOT_FOUND') {
				console.error(
					"[rsa-compat] Unexpected error when using 'ursa':"
				);
				console.error(e);
			}
			if (!oldver) {
				oldver = true;
				console.warn(
					'[WARN] rsa-compat: Your version of node does not have crypto.generateKeyPair()'
				);
				console.warn(
					"[WARN] rsa-compat: Please update to node >= v10.12 or 'npm install --save ursa node-forge'"
				);
				console.warn(
					'[WARN] rsa-compat: Using node-forge as a fallback may be unacceptably slow.'
				);
				if (/arm|mips/i.test(require('os').arch)) {
					console.warn(
						'================================================================'
					);
					console.warn('                         WARNING');
					console.warn(
						'================================================================'
					);
					console.warn('');
					console.warn(
						'WARNING: You are generating an RSA key using pure JavaScript on'
					);
					console.warn(
						'         a VERY SLOW cpu. This could take DOZENS of minutes!'
					);
					console.warn('');
					console.warn(
						"         We recommend installing node >= v10.12, or 'gcc' and 'ursa'"
					);
					console.warn('');
					console.warn('EXAMPLE:');
					console.warn('');
					console.warn(
						'        sudo apt-get install build-essential && npm install ursa'
					);
					console.warn('');
					console.warn(
						'================================================================'
					);
				}
			}
			try {
				return require('./generate-privkey-forge.js')(bitlen, exp);
			} catch (e) {
				if (e.code !== 'MODULE_NOT_FOUND') {
					throw e;
				}
				console.error(
					'[ERROR] rsa-compat: could not generate a private key.'
				);
				console.error(
					'None of crypto.generateKeyPair, ursa, nor node-forge are present'
				);
			}
		}
	}
};

if (require.main === module) {
	var keypair = module.exports(2048, 0x10001);
	console.info(keypair.privateKeyPem);
}
