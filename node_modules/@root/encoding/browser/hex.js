'use strict';

var Enc = require('./bytes.js');

// To Hex

Enc.bufToHex = function(u8) {
	var hex = [];
	var i, h;
	var len = u8.byteLength || u8.length;

	for (i = 0; i < len; i += 1) {
		h = u8[i].toString(16);
		if (2 !== h.length) {
			h = '0' + h;
		}
		hex.push(h);
	}

	return hex.join('').toLowerCase();
};

Enc.numToHex = function(d) {
	d = d.toString(16); // .padStart(2, '0');
	if (d.length % 2) {
		return '0' + d;
	}
	return d;
};

Enc.strToHex = function(str) {
	return Enc._binToHex(Enc.strToBin(str));
};

Enc._binToHex = function(bin) {
	return bin
		.split('')
		.map(function(ch) {
			var h = ch.charCodeAt(0).toString(16);
			if (2 !== h.length) {
				h = '0' + h;
			}
			return h;
		})
		.join('');
};

// From Hex

Enc.hexToBuf = function(hex) {
	var arr = [];
	hex.match(/.{2}/g).forEach(function(h) {
		arr.push(parseInt(h, 16));
	});
	return 'undefined' !== typeof Uint8Array ? new Uint8Array(arr) : arr;
};

Enc.hexToStr = function(hex) {
	return Enc.binToStr(_hexToBin(hex));
};

function _hexToBin(hex) {
	return hex.replace(/([0-9A-F]{2})/gi, function(_, p1) {
		return String.fromCharCode('0x' + p1);
	});
}

Enc._hexToBin = _hexToBin;

module.exports = Enc;
