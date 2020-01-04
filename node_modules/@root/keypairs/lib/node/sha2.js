/* global Promise */
'use strict';

var sha2 = module.exports;
var crypto = require('crypto');

sha2.sum = function(alg, str) {
	return Promise.resolve().then(function() {
		var sha = 'sha' + String(alg).replace(/^sha-?/i, '');
		// utf8 is the default for strings
		var buf = Buffer.from(str);
		return crypto
			.createHash(sha)
			.update(buf)
			.digest();
	});
};
