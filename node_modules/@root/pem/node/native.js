'use strict';

// "A little copying is better than a little dependency" - Rob Pike
var Enc = module.exports;

Enc.bufToBase64 = function(buf) {
	return Buffer.from(buf).toString('base64');
};

Enc.base64ToBuf = function(b64) {
	return Buffer.from(b64, 'base64');
};
