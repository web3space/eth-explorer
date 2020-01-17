'use strict';

var X509 = module.exports;
var packer = require('./packers');
var parser = require('./parsers');
Object.keys(parser).forEach(function(key) {
	X509[key] = parser[key];
});
Object.keys(packer).forEach(function(key) {
	X509[key] = packer[key];
});
