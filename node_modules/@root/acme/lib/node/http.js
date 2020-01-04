'use strict';

var http = module.exports;
var promisify = require('util').promisify;
var request = promisify(require('@root/request'));

http.request = function(opts) {
	return request(opts);
};
