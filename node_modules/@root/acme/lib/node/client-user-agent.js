'use strict';

var os = require('os');
var ver = require('../../package.json').version;

var UserAgent = module.exports;
UserAgent.get = function(me) {
	// ACME clients MUST have an RFC7231-compliant User-Agent
	// ex: Greenlock/v3 ACME.js/v3 node/v12.0.0 darwin/17.7.0 Darwin/x64
	//
	// See https://tools.ietf.org/html/rfc8555#section-6.1
	// And https://tools.ietf.org/html/rfc7231#section-5.5.3
	// And https://community.letsencrypt.org/t/user-agent-flag-explained/3843/2

	var ua =
		'ACME.js/' +
		ver +
		' ' +
		process.release.name +
		'/' +
		process.version +
		' ' +
		os.platform() +
		'/' +
		os.release() +
		' ' +
		os.type() +
		'/' +
		process.arch;

	var pkg = me.packageAgent;
	if (pkg) {
		ua = pkg + ' ' + ua;
	}

	return ua;
};
