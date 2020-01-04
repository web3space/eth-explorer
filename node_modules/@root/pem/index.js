'use strict';

var PEM = require('./parser.js');
var PEMPacker = require('./packer.js');
PEM.packBlock = PEMPacker.packBlock;

module.exports = PEM;
