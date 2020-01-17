'use strict';

var Enc = require('./bytes.js');

// To Base64

Enc.bufToBase64 = function(u8) {
	var bin = '';
	u8.forEach(function(i) {
		bin += String.fromCharCode(i);
	});
	return btoa(bin);
};

Enc.strToBase64 = function(str) {
	return btoa(Enc.strToBin(str));
};

// From Base64

function _base64ToBin(b64) {
	return atob(Enc.urlBase64ToBase64(b64));
}

Enc._base64ToBin = _base64ToBin;

Enc.base64ToBuf = function(b64) {
	return Enc.binToBuf(_base64ToBin(b64));
};

Enc.base64ToStr = function(b64) {
	return Enc.binToStr(_base64ToBin(b64));
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
	return Enc.base64ToUrlBase64(Enc.bufToBase64(buf));
};

Enc.strToUrlBase64 = function(str) {
	return Enc.bufToUrlBase64(Enc.strToBuf(str));
};

module.exports = Enc;
