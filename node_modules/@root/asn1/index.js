'use strict';

var ASN1 = module.exports;
var packer = require('./packer.js');
var parser = require('./parser.js');
Object.keys(parser).forEach(function(key) {
	ASN1[key] = parser[key];
});
Object.keys(packer).forEach(function(key) {
	ASN1[key] = packer[key];
});
