'use strict';

var sha2 = module.exports;

var encoder = new TextEncoder();
sha2.sum = function(alg, str) {
	var data = str;
	if ('string' === typeof data) {
		data = encoder.encode(str);
	}
	var sha = 'SHA-' + String(alg).replace(/^sha-?/i, '');
	return window.crypto.subtle.digest(sha, data);
};
