// Copyright 2016-2018 AJ ONeal. All rights reserved
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

module.exports = function(bitlen, exp) {
	var keypair = require('crypto').generateKeyPairSync('rsa', {
		modulusLength: bitlen,
		publicExponent: exp,
		privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
		publicKeyEncoding: { type: 'pkcs1', format: 'pem' }
	});
	var result = { privateKeyPem: keypair.privateKey.trim() };
	return result;
};

if (require.main === module) {
	var keypair = module.exports(2048, 0x10001);
	console.info(keypair.privateKeyPem);
}
