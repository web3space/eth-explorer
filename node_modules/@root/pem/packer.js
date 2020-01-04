'use strict';

var PEM = module.exports;

//var Enc = require('@root/encoding/base64');
var Enc = require('./node/native.js');

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
