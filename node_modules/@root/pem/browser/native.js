'use strict';

// "A little copying is better than a little dependency" - Rob Pike
var Enc = module.exports;

Enc.bufToBase64 = function(u8) {
	var bin = '';
	// map is not part of u8
	u8.forEach(function(i) {
		bin += String.fromCharCode(i);
	});
	return btoa(bin);
};

Enc.base64ToBuf = function(b64) {
	return Uint8Array.from(
		atob(b64)
			.split('')
			.map(function(ch) {
				return ch.charCodeAt(0);
			})
	);
};
