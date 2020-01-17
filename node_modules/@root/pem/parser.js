'use strict';

var PEM = module.exports;

var Enc = require('./node/native.js');

PEM.parseBlock = function(str) {
	var der = str
		.split(/\n/)
		.filter(function(line) {
			return !/-----/.test(line);
		})
		.join('');
	return { bytes: Enc.base64ToBuf(der) };
};
