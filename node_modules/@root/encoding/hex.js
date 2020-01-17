'use strict';

var Enc = require('./bytes.js');

// to Hex

function bufToHex(buf) {
	// in case it's a Uint8Array
	return Buffer.from(buf).toString('hex');
}

Enc.bufToHex = bufToHex;

Enc.strToHex = function(str) {
	return Buffer.from(str).toString('hex');
};

// from Hex

function hexToBuf(hex) {
	return Buffer.from(hex, 'hex');
}

Enc.hexToBuf = hexToBuf;

Enc.hexToStr = function(hex) {
	return hexToBuf(hex).toString('utf8');
};

// to/from num

Enc.numToHex = function(d) {
	d = d.toString(16);
	if (d.length % 2) {
		return '0' + d;
	}
	return d;
};

module.exports = Enc;
