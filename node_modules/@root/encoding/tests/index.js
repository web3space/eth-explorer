'use strict';

var Enc =
	('undefined' === typeof window ? {} : window).Encoding || require('../');

//UTF-8
var pass = 0;
var references = {
	string: 'I ½ ♥ 𩶘',
	array: [73, 32, 194, 189, 32, 226, 153, 165, 32, 240, 169, 182, 152],
	hex: [
		'49',
		'20',
		'c2',
		'bd',
		'20',
		'e2',
		'99',
		'a5',
		'20',
		'f0',
		'a9',
		'b6',
		'98'
	].join(''),
	base64: 'SSDCvSDimaUg8Km2mA==',
	urlBase64: 'SSDCvSDimaUg8Km2mA',
	base32: 'JEQMFPJA4KM2KIHQVG3JQ==='
};
references.bin = references.array
	.map(function(n) {
		return String.fromCharCode(n);
	})
	.join('');
references.buffer = Uint8Array.from(references.array);
var binrefs = {
	// Note that the binary string "ÿâó<86>Î<93>k" can't be serialized to text
	array: [255, 226, 26, 243, 134, 206, 147, 107],
	hex: 'ffe21af386ce936b',
	base64: '/+Ia84bOk2s=',
	urlBase64: '_-Ia84bOk2s'
};
binrefs.buffer = new Uint8Array(binrefs.array);

var str = references.string;
var buf = Enc.strToBuf(references.string);
var base64 = Enc.bufToBase64(references.buffer);
var hex = Enc.bufToHex(references.buffer);
//var b32 = Enc.bufToBase32(references.buffer);

function buffersAreEqual(buf1, buf2) {
	if (buf1.length !== buf2.length) {
		return false;
	}
	return Array.prototype.every.call(buf1, function(byte, i) {
		if (byte === buf2[i]) {
			return true;
		}
	});
}

// To Binary String
if (Enc.strToBin(references.string) === references.bin) {
	pass += 1;
} else {
	console.error('[FAIL] str -> bin');
}
if (Enc.bufToBin(references.array) !== references.bin) {
	console.error('[FAIL] buf -> bin');
} else {
	pass += 1;
}

// To Byte Array
if (!buffersAreEqual(Enc.strToBuf(references.string), references.array)) {
	console.error('[FAIL] utf8 -> buf');
} else {
	pass += 1;
}
if (!buffersAreEqual(Enc.base64ToBuf(references.base64), references.array)) {
	console.error('[FAIL] base64 -> buf');
} else {
	pass += 1;
}
if (!buffersAreEqual(Enc.hexToBuf(references.hex), references.array)) {
	console.error('[FAIL] hex -> buf');
} else {
	pass += 1;
}
if (!buffersAreEqual(Enc.binToBuf(references.bin), references.array)) {
	console.error('[FAIL] bin -> buf');
} else {
	pass += 1;
}

// To Unicode String
if (Enc.bufToStr(references.array) !== references.string) {
	console.error('[FAIL] buf -> str');
} else {
	pass += 1;
}
if (Enc.base64ToStr(references.base64) !== references.string) {
	console.error('[FAIL] base64 -> str');
} else {
	pass += 1;
}
if (Enc.base64ToStr(references.urlBase64) !== references.string) {
	console.error('[FAIL] url base64 -> str');
} else {
	pass += 1;
}
if (Enc.hexToStr(references.hex) !== references.string) {
	console.error('[FAIL] hex -> str');
} else {
	pass += 1;
}
if (Enc.binToStr(references.bin) !== references.string) {
	console.error('[FAIL] bin -> str');
} else {
	pass += 1;
}

// To Base64
if (Enc.bufToBase64(references.array) !== references.base64) {
	console.error('[FAIL] buf -> base64');
} else {
	pass += 1;
}
if (Enc.bufToUrlBase64(references.array) !== references.urlBase64) {
	console.error('[FAIL] buf -> url base64');
} else {
	pass += 1;
}
if (Enc.strToBase64(references.string) !== references.base64) {
	console.error('[FAIL] str -> base64');
} else {
	pass += 1;
}
if (Enc.strToUrlBase64(references.string) !== references.urlBase64) {
	console.error('[FAIL] str -> url base64');
} else {
	pass += 1;
}
if (Enc.hexToBase64(references.hex) !== references.base64) {
	console.error('[FAIL] hex -> base64');
} else {
	pass += 1;
}

// To Hex
if (Enc.bufToHex(references.array) !== references.hex) {
	console.error('[FAIL] buf -> hex');
} else {
	pass += 1;
}
if (Enc.strToHex(references.string) !== references.hex) {
	console.error('[FAIL] str -> hex', Enc.strToHex(references.string));
} else {
	pass += 1;
}
if (Enc.base64ToHex(references.base64) !== references.hex) {
	console.error('[FAIL] base64 -> hex');
} else {
	pass += 1;
}

// Raw Binary
if (Enc.bufToUrlBase64(binrefs.array) !== binrefs.urlBase64) {
	console.error('[FAIL] buf -> url base64');
} else {
	pass += 1;
}

var bytes = binrefs.array;
buf = new Uint8Array(bytes);
str = Enc.bufToBin(buf);
base64 = Enc.bufToBase64(buf);
hex = Enc.bufToHex(buf);

// This can't be properly tested because binary strings can't be parsed
// if (str !== "ÿâóÎk") {
//   pass += 1;
//   console.log('[FAIL] binary -> str', str);
// }
if (binrefs.base64 !== base64) {
	console.error('[FAIL] binary -> base64', base64);
} else {
	pass += 1;
}
if (binrefs.hex !== hex) {
	console.error('[FAIL] binary -> hex', hex);
} else {
	pass += 1;
}

//
// Base32
//
/*
	b32 = Enc.bufToBase32(references.buffer);
	if (references.base32 !== b32) {
		pass += 1;
		console.error('[FAIL] binary -> base32', references.base32, '!==', b32);
	}
	buf = Enc.base32ToBuffer(references.base32);
	if (!buffersAreEqual(buf, references.buffer)) {
		pass += 1
		console.error('[FAIL] base32 -> binary', references.buffer, '!==', buf);
	}
  */

if (22 === pass) {
	console.info('[PASS] ' + pass + ' tests passed');
} else {
	console.error('[FAIL] ' + (22 - pass) + ' of 22 tests failed');
}
