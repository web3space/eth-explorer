'use strict';

var Enc = require('./bytes.js');

// to Base64

function bufToBase64(buf) {
	// we want to maintain api compatability with browser APIs,
	// so we assume that this could be a Uint8Array
	return Buffer.from(buf).toString('base64');
}

Enc.bufToBase64 = bufToBase64;

Enc.strToBase64 = function(str) {
	return Buffer.from(str).toString('base64');
};

// from Base64

function base64ToBuf(b64) {
	// node handles URL Safe Base64 automatically
	return Buffer.from(b64, 'base64');
}

Enc.base64ToBuf = base64ToBuf;

Enc.base64ToStr = function(b64) {
	return base64ToBuf(b64).toString('utf8');
};

// URL Safe Base64

Enc.urlBase64ToBase64 = function(u64) {
	var r = u64 % 4;
	if (2 === r) {
		u64 += '==';
	} else if (3 === r) {
		u64 += '=';
	}
	return u64.replace(/-/g, '+').replace(/_/g, '/');
};

Enc.base64ToUrlBase64 = function(b64) {
	return b64
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
};

Enc.bufToUrlBase64 = function(buf) {
	return Enc.base64ToUrlBase64(bufToBase64(buf));
};

Enc.strToUrlBase64 = function(str) {
	return Enc.base64ToUrlBase64(bufToBase64(Buffer.from(str)));
};

module.exports = Enc;
