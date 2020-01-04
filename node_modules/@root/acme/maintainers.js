'use strict';

var M = module.exports;
var native = require('./lib/native.js');

// Keep track of active maintainers so that we know who to inform if
// something breaks or has a serious bug or flaw.

var oldCollegeTries = {};
M.init = function(me) {
	if (oldCollegeTries[me.maintainerEmail]) {
		return;
	}

	var tz = '';
	try {
		// Use timezone to stagger messages to maintainers
		tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	} catch (e) {
		// ignore node versions with no or incomplete Intl
	}

	// Use locale to know what language to use
	var env = process.env;
	var locale = env.LC_ALL || env.LC_MESSAGES || env.LANG || env.LANGUAGE;

	try {
		M._init(me, tz, locale);
	} catch (e) {
		//console.log(e);
		// ignore
	}
};

M._init = function(me, tz, locale) {
	// prevent a stampede from misconfigured clients in an eternal loop
	setTimeout(function() {
		me.request({
			method: 'GET',
			url: 'https://api.rootprojects.org/api/nonce',
			json: true
		})
			.then(function(resp) {
				// in the browser this will work until solved, but in
				// node this will bail unless the challenge is trivial
				return native._hashcash(resp.body || {});
			})
			.then(function(hashcash) {
				var req = {
					headers: {
						'x-root-nonce-v1': hashcash
					},
					method: 'POST',
					url:
						'https://api.rootprojects.org/api/projects/ACME.js/dependents',
					json: {
						maintainer: me.maintainerEmail,
						package: me.packageAgent,
						tz: tz,
						locale: locale
					}
				};
				return me
					.request(req)
					.catch(function(err) {
						if (me.debug) {
							console.error(
								'error adding maintainer to support notices:'
							);
							console.error(err);
						}
					})
					.then(function(/*resp*/) {
						oldCollegeTries[me.maintainerEmail] = true;
						//console.log(resp);
					});
			});
	}, me.__timeout || 3000);
};

if (require.main === module) {
	var ACME = require('./');
	var acme = ACME.create({
		maintainerEmail: 'aj+acme-test@rootprojects.org',
		packageAgent: 'test/v0',
		__timeout: 100
	});
	M.init(acme);
}
