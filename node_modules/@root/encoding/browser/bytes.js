'use strict';

var Enc = module.exports;

// to Binary String

Enc.bufToBin = function(buf) {
	var bin = '';
	// cannot use .map() because Uint8Array would return only 0s
	buf.forEach(function(ch) {
		bin += String.fromCharCode(ch);
	});
	return bin;
};

Enc.strToBin = function(str) {
	// Note: TextEncoder might be faster (or it might be slower, I don't know),
	// but it doesn't solve the double-utf8 problem and MS Edge still has users without it
	var escstr = encodeURIComponent(str);
	// replaces any uri escape sequence, such as %0A,
	// with binary escape, such as 0x0A
	var binstr = escstr.replace(/%([0-9A-F]{2})/g, function(_, p1) {
		return String.fromCharCode('0x' + p1);
	});
	return binstr;
};

// to Buffer

Enc.binToBuf = function(bin) {
	var arr = bin.split('').map(function(ch) {
		return ch.charCodeAt(0);
	});
	return 'undefined' !== typeof Uint8Array ? new Uint8Array(arr) : arr;
};

Enc.strToBuf = function(str) {
	return Enc.binToBuf(Enc.strToBin(str));
};

// to Unicode String

Enc.binToStr = function(binstr) {
	var escstr = binstr.replace(/(.)/g, function(m, p) {
		var code = p
			.charCodeAt(0)
			.toString(16)
			.toUpperCase();
		if (code.length < 2) {
			code = '0' + code;
		}
		return '%' + code;
	});

	return decodeURIComponent(escstr);
};

Enc.bufToStr = function(buf) {
	return Enc.binToStr(Enc.bufToBin(buf));
};

// Base64 + Hex

Enc.base64ToHex = function(b64) {
	return Enc.bufToHex(Enc.base64ToBuf(b64));
};

Enc.hexToBase64 = function(hex) {
	return btoa(Enc._hexToBin(hex));
};
