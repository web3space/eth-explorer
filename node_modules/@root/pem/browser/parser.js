'use strict';

var Enc = require('@root/encoding/base64');
var PEM = module.exports;

PEM.packBlock = function(opts) {
	// TODO allow for headers?
	return (
		'-----BEGIN ' +
		opts.type +
		'-----\n' +
		Enc.bufToBase64(opts.bytes)
			.match(/.{1,64}/g)
			.join('\n') +
		'\n' +
		'-----END ' +
		opts.type +
		'-----'
	);
};

// don't replace the full parseBlock, if it exists
PEM.parseBlock =
	PEM.parseBlock ||
	function(str) {
		var der = str
			.split(/\n/)
			.filter(function(line) {
				return !/-----/.test(line);
			})
			.join('');
		return { bytes: Enc.base64ToBuf(der) };
	};
