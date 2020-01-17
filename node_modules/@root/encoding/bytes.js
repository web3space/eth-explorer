'use strict';

var Enc = module.exports;

/*
Enc.bufToUint8 = function bufToUint8(buf) {
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
*/

// from Binary Strings

Enc.binToBuf = function(bin) {
	return Buffer.from(bin, 'binary');
};

Enc.binToStr = function(bin) {
	return Enc.binToBuf(bin).toString('utf8');
};

// from Buffer

Enc.bufToBin = function(buf) {
	return Buffer.from(buf).toString('binary');
};

Enc.bufToStr = function(buf) {
	return Buffer.from(buf).toString('utf8');
};

// from Unicode Strings

Enc.strToBin = function(str) {
	return Buffer.from(str).toString('binary');
};

Enc.strToBuf = function(str) {
	// default is 'utf8'
	return Buffer.from(str);
};

// Base64 and Hex

Enc.base64ToHex = function(b64) {
	return Buffer.from(b64, 'base64').toString('hex');
};

Enc.hexToBase64 = function(hex) {
	return Buffer.from(hex, 'hex').toString('base64');
};
