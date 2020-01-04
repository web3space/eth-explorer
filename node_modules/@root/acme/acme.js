// Copyright 2018-present AJ ONeal. All rights reserved
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';
/* globals Promise */

require('@root/encoding/bytes');
var Enc = require('@root/encoding/base64');
var ACME = module.exports;
var Keypairs = require('@root/keypairs');
var CSR = require('@root/csr');
var sha2 = require('@root/keypairs/lib/node/sha2.js');
var http = require('./lib/node/http.js');
var A = require('./account.js');
var U = require('./utils.js');
var E = require('./errors.js');
var M = require('./maintainers.js');

var native = require('./lib/native.js');

ACME.create = function create(me) {
	if (!me) {
		me = {};
	}

	// me.debug = true;
	me._nonces = [];
	me._canCheck = {};

	if (!/.+@.+\..+/.test(me.maintainerEmail)) {
		throw new Error(
			'you should supply `maintainerEmail` as a contact for security and critical bug notices'
		);
	}

	if (!/\w\/v?\d/.test(me.packageAgent) && false !== me.packageAgent) {
		console.error(
			"\nyou should supply `packageAgent` as an rfc7231-style User-Agent such as Foo/v1.1\n\n\t// your package agent should be this:\n\tvar pkg = require('./package.json');\n\tvar agent = pkg.name + '/' + pkg.version\n"
		);
		process.exit(1);
		return;
	}

	if (!me.dns01) {
		me.dns01 = function(ch) {
			return native._dns01(me, ch);
		};
	}

	if (!me.http01) {
		// for browser version only
		if (!me._baseUrl) {
			me._baseUrl = '';
		}
		me.http01 = function(ch) {
			return native._http01(me, ch);
		};
	}

	if (!me.__request) {
		me.__request = http.request;
	}
	// passed to dependencies
	me.request = function(opts) {
		return U._request(me, opts);
	};

	me.init = function(opts) {
		M.init(me);

		function fin(dir) {
			me._directoryUrls = dir;
			me._tos = dir.meta.termsOfService;
			return dir;
		}
		if (opts && opts.meta && opts.termsOfService) {
			return Promise.resolve(fin(opts));
		}
		if (!me.directoryUrl) {
			me.directoryUrl = opts;
		}
		if ('string' !== typeof me.directoryUrl) {
			throw new Error(
				'you must supply either the ACME directory url as a string or an object of the ACME urls'
			);
		}

		var p = Promise.resolve();
		if (!me.skipChallengeTest) {
			p = native._canCheck(me);
		}
		return p.then(function() {
			return ACME._directory(me).then(function(resp) {
				return fin(resp.body);
			});
		});
	};
	me.accounts = {
		create: function(options) {
			try {
				return A._registerAccount(me, options);
			} catch (e) {
				return Promise.reject(e);
			}
		}
	};
	/*
	me.authorizations = {
		// create + get challlenges
		get: function(options) {
			return A._getAccountKid(me, options).then(function(kid) {
				ACME._normalizePresenters(me, options, options.challenges);
				return ACME._orderCert(me, options, kid).then(function(order) {
					return order.claims;
				});
			});
		},
		// set challenges, check challenges, finalize order, return order
		present: function(options) {
			return A._getAccountKid(me, options).then(function(kid) {
				ACME._normalizePresenters(me, options, options.challenges);
				return ACME._finalizeOrder(me, options, kid, options.order);
			});
		}
	};
  */
	me.certificates = {
		create: function(options) {
			return A._getAccountKid(me, options).then(function(kid) {
				ACME._normalizePresenters(me, options, options.challenges);
				return ACME._getCertificate(me, options, kid);
			});
		}
	};
	return me;
};

// http-01: GET https://example.org/.well-known/acme-challenge/{{token}} => {{keyAuth}}
// dns-01: TXT _acme-challenge.example.org. => "{{urlSafeBase64(sha256(keyAuth))}}"
ACME.challengePrefixes = {
	'http-01': '/.well-known/acme-challenge',
	'dns-01': '_acme-challenge'
};
ACME.challengeTests = {
	'http-01': function(me, auth) {
		var ch = auth.challenge;
		return me.http01(ch).then(function(keyAuth) {
			var err;

			// TODO limit the number of bytes that are allowed to be downloaded
			if (ch.keyAuthorization === (keyAuth || '').trim()) {
				return true;
			}

			err = new Error(
				'Error: Failed HTTP-01 Pre-Flight / Dry Run.\n' +
					"curl '" +
					ch.challengeUrl +
					"'\n" +
					"Expected: '" +
					ch.keyAuthorization +
					"'\n" +
					"Got: '" +
					keyAuth +
					"'\n" +
					'See https://git.rootprojects.org/root/acme.js/issues/4'
			);
			err.code = 'E_FAIL_DRY_CHALLENGE';
			throw err;
		});
	},
	'dns-01': function(me, auth) {
		// remove leading *. on wildcard domains
		var ch = auth.challenge;
		return me.dns01(ch).then(function(ans) {
			var err;

			if (
				ans.answer.some(function(txt) {
					return ch.dnsAuthorization === txt.data[0];
				})
			) {
				return true;
			}

			err = new Error(
				'Error: Failed DNS-01 Pre-Flight Dry Run.\n' +
					"dig TXT '" +
					ch.dnsHost +
					"' does not return '" +
					ch.dnsAuthorization +
					"'\n" +
					'See https://git.rootprojects.org/root/acme.js/issues/4'
			);
			err.code = 'E_FAIL_DRY_CHALLENGE';
			throw err;
		});
	}
};

ACME._directory = function(me) {
	// TODO cache the directory URL

	// GET-as-GET ok
	return U._request(me, { method: 'GET', url: me.directoryUrl, json: true });
};

// registerAccount
// postChallenge
// finalizeOrder
// getCertificate
ACME._getCertificate = function(me, options, kid) {
	//#console.debug('[ACME.js] certificates.create');
	return ACME._orderCert(me, options, kid).then(function(order) {
		return ACME._finalizeOrder(me, options, kid, order);
	});
};
ACME._normalizePresenters = function(me, options, presenters) {
	// Prefer this order for efficiency:
	// * http-01 is the fasest
	// * tls-alpn-01 is for networks that don't allow plain traffic
	// * dns-01 is the slowest (due to DNS propagation),
	//   but is required for private networks and wildcards
	var presenterTypes = Object.keys(options.challenges || {});
	options._presenterTypes = ['http-01', 'tls-alpn-01', 'dns-01'].filter(
		function(typ) {
			return -1 !== presenterTypes.indexOf(typ);
		}
	);
	if (
		presenters['dns-01'] &&
		'number' !== typeof presenters['dns-01'].propagationDelay
	) {
		if (!ACME._propagationDelayWarning) {
			var err = new Error(
				"dns-01 challenge's `propagationDelay` not set, defaulting to 5000ms"
			);
			err.code = 'E_NO_DNS_DELAY';
			err.description =
				"Each dns-01 challenge should specify challenges['dns-01'].propagationDelay as an estimate of how long DNS propagation will take.";
			ACME._notify(me, options, 'warning', err);
			presenters['dns-01'].propagationDelay = 5000;
			ACME._propagationDelayWarning = true;
		}
	}
	Object.keys(presenters || {}).forEach(function(k) {
		var ch = presenters[k];
		var warned = false;

		if (!ch.set || !ch.remove) {
			throw new Error('challenge plugin must have set() and remove()');
		}
		if (!ch.get) {
			if ('dns-01' === k) {
				console.warn('dns-01 challenge plugin should have get()');
			} else {
				throw new Error(
					'http-01 and tls-alpn-01 challenge plugins must have get()'
				);
			}
		}

		if ('dns-01' === k) {
			if (!ch.zones) {
				console.warn('dns-01 challenge plugin should have zones()');
			}
		}

		function warn() {
			if (warned) {
				return;
			}
			warned = true;
			console.warn(
				"'" +
					k +
					"' may have incorrect function signatures, or contains deprecated use of callbacks"
			);
		}

		function promisify(fn) {
			return function(opts) {
				new Promise(function(resolve, reject) {
					fn(opts, function(err, result) {
						if (err) {
							reject(err);
							return;
						}
						resolve(result);
					});
				});
			};
		}

		// init, zones, set, get, remove
		if (ch.init && 2 === ch.init.length) {
			warn();
			ch._thunk_init = ch.init;
			ch.init = promisify(ch._thunk_init);
		}
		if (ch.zones && 2 === ch.zones.length) {
			warn();
			ch._thunk_zones = ch.zones;
			ch.zones = promisify(ch._thunk_zones);
		}
		if (2 === ch.set.length) {
			warn();
			ch._thunk_set = ch.set;
			ch.set = promisify(ch._thunk_set);
		}
		if (2 === ch.remove.length) {
			warn();
			ch._thunk_remove = ch.remove;
			ch.remove = promisify(ch._thunk_remove);
		}
		if (ch.get && 2 === ch.get.length) {
			warn();
			ch._thunk_get = ch.get;
			ch.get = promisify(ch._thunk_get);
		}

		return ch;
	});
};

/*
 POST /acme/new-order HTTP/1.1
 Host: example.com
 Content-Type: application/jose+json

 {
   "protected": base64url({
     "alg": "ES256",
     "kid": "https://example.com/acme/acct/1",
     "nonce": "5XJ1L3lEkMG7tR6pA00clA",
     "url": "https://example.com/acme/new-order"
   }),
   "payload": base64url({
     "identifiers": [{"type:"dns","value":"example.com"}],
     "notBefore": "2016-01-01T00:00:00Z",
     "notAfter": "2016-01-08T00:00:00Z"
   }),
   "signature": "H6ZXtGjTZyUnPeKn...wEA4TklBdh3e454g"
 }
*/
ACME._getAuthorization = function(me, options, kid, zonenames, authUrl) {
	//#console.debug('\n[DEBUG] getAuthorization\n');

	return U._jwsRequest(me, {
		accountKey: options.accountKey,
		url: authUrl,
		protected: { kid: kid },
		payload: ''
	}).then(function(resp) {
		// Pre-emptive rather than lazy for interfaces that need to show the
		// challenges to the user first
		return ACME._computeAuths(
			me,
			options,
			'',
			resp.body,
			zonenames,
			false
		).then(function(auths) {
			resp.body._rawChallenges = resp.body.challenges;
			resp.body.challenges = auths;
			return resp.body;
		});
	});
};

ACME._testChallengeOptions = function() {
	// we want this to be the same for the whole group
	var chToken = ACME._prnd(16);
	return [
		{
			type: 'http-01',
			status: 'pending',
			url: 'https://acme-staging-v02.example.com/0',
			token: 'test-' + chToken + '-0'
		},
		{
			type: 'dns-01',
			status: 'pending',
			url: 'https://acme-staging-v02.example.com/1',
			token: 'test-' + chToken + '-1',
			_wildcard: true
		},
		{
			type: 'tls-alpn-01',
			status: 'pending',
			url: 'https://acme-staging-v02.example.com/3',
			token: 'test-' + chToken + '-3'
		}
	];
};

ACME._thumber = function(options, thumb) {
	var thumbPromise;
	return function(key) {
		if (thumb) {
			return Promise.resolve(thumb);
		}
		if (thumbPromise) {
			return thumbPromise;
		}
		if (!key) {
			key = options.accountKey || options.accountKeypair;
		}
		thumbPromise = U._importKeypair(key).then(function(pair) {
			return Keypairs.thumbprint({
				jwk: pair.public
			});
		});
		return thumbPromise;
	};
};

ACME._dryRun = function(me, realOptions, zonenames) {
	var noopts = {};
	Object.keys(realOptions).forEach(function(key) {
		noopts[key] = realOptions[key];
	});
	noopts.order = {};

	// memoized so that it doesn't run until it's first called
	var getThumbprint = ACME._thumber(noopts, '');

	return Promise.all(
		noopts.domains.map(function(identifierValue) {
			// TODO we really only need one to pass, not all to pass
			var challenges = ACME._testChallengeOptions();
			var wild = '*.' === identifierValue.slice(0, 2);
			if (wild) {
				challenges = challenges.filter(function(ch) {
					return ch._wildcard;
				});
			}
			challenges = challenges.filter(function(auth) {
				return me._canCheck[auth.type];
			});

			return getThumbprint().then(function(accountKeyThumb) {
				var resp = {
					body: {
						identifier: {
							type: 'dns',
							value: identifierValue.replace(/^\*\./, '')
						},
						challenges: challenges,
						expires: new Date(Date.now() + 60 * 1000).toISOString(),
						wildcard: identifierValue.includes('*.') || undefined
					}
				};

				// The dry-run comes first in the spirit of "fail fast"
				// (and protecting against challenge failure rate limits)
				var dryrun = true;
				return ACME._computeAuths(
					me,
					noopts,
					accountKeyThumb,
					resp.body,
					zonenames,
					dryrun
				).then(function(auths) {
					resp.body.challenges = auths;
					return resp.body;
				});
			});
		})
	).then(function(claims) {
		var selected = [];
		noopts.order._claims = claims.slice(0);
		noopts.notify = function(ev, params) {
			if ('_challenge_select' === ev) {
				selected.push(params.challenge);
			}
		};

		function clear() {
			selected.forEach(function(ch) {
				ACME._notify(me, noopts, 'challenge_remove', {
					altname: ch.altname,
					type: ch.type
					//challenge: ch
				});
				// ignore promise return
				noopts.challenges[ch.type]
					.remove({ challenge: ch })
					.catch(function(err) {
						err.action = 'challenge_remove';
						err.altname = ch.altname;
						err.type = ch.type;
						ACME._notify(me, noopts, 'error', err);
					});
			});
		}

		return ACME._setChallenges(me, noopts, noopts.order)
			.catch(function(err) {
				clear();
				throw err;
			})
			.then(clear);
	});
};

// Get the list of challenge types we can validate,
// which is already ordered by preference.
// Select the first matching offered challenge type
ACME._chooseChallenge = function(options, results) {
	// For each of the challenge types that we support
	var challenge;
	options._presenterTypes.some(function(chType) {
		// And for each of the challenge types that are allowed
		return results.challenges.some(function(ch) {
			// Check to see if there are any matches
			if (ch.type === chType) {
				challenge = ch;
				return true;
			}
		});
	});

	return challenge;
};

ACME._getZones = function(me, challenges, domains) {
	var presenter = challenges['dns-01'];
	if (!presenter) {
		return Promise.resolve([]);
	}
	if ('function' !== typeof presenter.zones) {
		return Promise.resolve([]);
	}

	// a little bit of random to ensure that getZones()
	// actually returns the zones and not the hosts as zones
	var dnsHosts = domains.map(function(d) {
		var rnd = ACME._prnd(2);
		return rnd + '.' + d;
	});

	var authChallenge = {
		type: 'dns-01',
		dnsHosts: dnsHosts
	};

	return presenter.zones({ challenge: authChallenge });
};

ACME._challengesMap = { 'http-01': 0, 'dns-01': 0, 'tls-alpn-01': 0 };
ACME._computeAuths = function(me, options, thumb, authz, zonenames, dryrun) {
	// we don't poison the dns cache with our dummy request
	var dnsPrefix = ACME.challengePrefixes['dns-01'];
	if (dryrun) {
		dnsPrefix = dnsPrefix.replace(
			'acme-challenge',
			'greenlock-dryrun-' + ACME._prnd(4)
		);
	}

	var getThumbprint = ACME._thumber(options, thumb);

	return Promise.all(
		authz.challenges.map(function(challenge) {
			// Don't do extra work for challenges that we can't satisfy
			var _types = options._presenterTypes;
			if (_types && !_types.includes(challenge.type)) {
				return null;
			}

			var auth = {};

			// straight copy from the new order response
			// { identifier, status, expires, challenges, wildcard }
			Object.keys(authz).forEach(function(key) {
				auth[key] = authz[key];
			});

			// copy from the challenge we've chosen
			// { type, status, url, token }
			// (note the duplicate status overwrites the one above, but they should be the same)
			Object.keys(challenge).forEach(function(key) {
				// don't confused devs with the id url
				auth[key] = challenge[key];
			});

			// batteries-included helpers
			auth.hostname = auth.identifier.value;
			// because I'm not 100% clear if the wildcard identifier does or doesn't
			// have the leading *. in all cases
			auth.altname = ACME._untame(auth.identifier.value, auth.wildcard);

			var zone = pluckZone(zonenames || [], auth.identifier.value);

			return ACME.computeChallenge({
				accountKey: options.accountKey,
				_getThumbprint: getThumbprint,
				challenge: auth,
				zone: zone,
				dnsPrefix: dnsPrefix
			}).then(function(resp) {
				Object.keys(resp).forEach(function(k) {
					auth[k] = resp[k];
				});
				return auth;
			});
		})
	).then(function(auths) {
		return auths.filter(Boolean);
	});
};

ACME.computeChallenge = function(opts) {
	var auth = opts.challenge;
	var hostname = auth.hostname || opts.hostname;
	var zone = opts.zone;
	var thumb = opts.thumbprint || '';
	var accountKey = opts.accountKey;
	var getThumbprint = opts._getThumbprint || ACME._thumber(opts, thumb);
	var dnsPrefix = opts.dnsPrefix || ACME.challengePrefixes['dns-01'];

	return getThumbprint(accountKey).then(function(thumb) {
		var resp = {};
		resp.thumbprint = thumb;
		//   keyAuthorization = token + '.' + base64url(JWK_Thumbprint(accountKey))
		resp.keyAuthorization = auth.token + '.' + thumb;

		if ('http-01' === auth.type) {
			// conflicts with ACME challenge id url is already in use,
			// so we call this challengeUrl instead
			// TODO auth.http01Url ?
			resp.challengeUrl =
				'http://' +
				// `hostname` is an alias of `auth.indentifier.value`
				hostname +
				ACME.challengePrefixes['http-01'] +
				'/' +
				auth.token;
		}

		if ('dns-01' !== auth.type) {
			return resp;
		}

		// Always calculate dnsAuthorization because we
		// may need to present to the user for confirmation / instruction
		// _as part of_ the decision making process
		return sha2
			.sum(256, resp.keyAuthorization)
			.then(function(hash) {
				return Enc.bufToUrlBase64(Uint8Array.from(hash));
			})
			.then(function(hash64) {
				resp.dnsHost = dnsPrefix + '.' + hostname; // .replace('*.', '');

				// deprecated
				resp.dnsAuthorization = hash64;
				// should use this instead
				resp.keyAuthorizationDigest = hash64;

				if (zone) {
					resp.dnsZone = zone;
					resp.dnsPrefix = resp.dnsHost
						.replace(newZoneRegExp(zone), '')
						.replace(/\.$/, '');
				}

				return resp;
			});
	});
};

ACME._untame = function(name, wild) {
	if (wild) {
		name = '*.' + name.replace('*.', '');
	}
	return name;
};

// https://tools.ietf.org/html/draft-ietf-acme-acme-10#section-7.5.1
ACME._postChallenge = function(me, options, kid, auth) {
	var RETRY_INTERVAL = me.retryInterval || 1000;
	var DEAUTH_INTERVAL = me.deauthWait || 10 * 1000;
	var MAX_POLL = me.retryPoll || 8;
	var MAX_PEND = me.retryPending || 4;
	var count = 0;

	var altname = ACME._untame(auth.identifier.value, auth.wildcard);

	/*
   POST /acme/authz/1234 HTTP/1.1
   Host: example.com
   Content-Type: application/jose+json

   {
     "protected": base64url({
       "alg": "ES256",
       "kid": "https://example.com/acme/acct/1",
       "nonce": "xWCM9lGbIyCgue8di6ueWQ",
       "url": "https://example.com/acme/authz/1234"
     }),
     "payload": base64url({
       "status": "deactivated"
     }),
     "signature": "srX9Ji7Le9bjszhu...WTFdtujObzMtZcx4"
   }
   */
	function deactivate() {
		//#console.debug('[ACME.js] deactivate:');
		return U._jwsRequest(me, {
			accountKey: options.accountKey,
			url: auth.url,
			protected: { kid: kid },
			payload: Enc.strToBuf(JSON.stringify({ status: 'deactivated' }))
		}).then(function(/*#resp*/) {
			//#console.debug('deactivate challenge: resp.body:');
			//#console.debug(resp.body);
			return ACME._wait(DEAUTH_INTERVAL);
		});
	}

	function pollStatus() {
		if (count >= MAX_POLL) {
			var err = new Error(
				"[ACME.js] stuck in bad pending/processing state for '" +
					altname +
					"'"
			);
			err.context = 'present_challenge';
			return Promise.reject(err);
		}

		count += 1;

		//#console.debug('\n[DEBUG] statusChallenge\n');
		// POST-as-GET
		return U._jwsRequest(me, {
			accountKey: options.accountKey,
			url: auth.url,
			protected: { kid: kid },
			payload: Enc.binToBuf('')
		})
			.then(checkResult)
			.catch(transformError);
	}

	function checkResult(resp) {
		ACME._notify(me, options, 'challenge_status', {
			// API-locked
			status: resp.body.status,
			type: auth.type,
			altname: altname
		});

		if ('processing' === resp.body.status) {
			//#console.debug('poll: again', auth.url);
			return ACME._wait(RETRY_INTERVAL).then(pollStatus);
		}

		// This state should never occur
		if ('pending' === resp.body.status) {
			if (count >= MAX_PEND) {
				return ACME._wait(RETRY_INTERVAL)
					.then(deactivate)
					.then(respondToChallenge);
			}
			//#console.debug('poll: again', auth.url);
			return ACME._wait(RETRY_INTERVAL).then(respondToChallenge);
		}

		// REMOVE DNS records as soon as the state is non-processing
		// (valid or invalid or other)
		try {
			options.challenges[auth.type].remove({ challenge: auth });
		} catch (e) {}

		if ('valid' === resp.body.status) {
			if (me.debug) {
				console.debug('poll: valid');
			}

			return resp.body;
		}

		var errmsg;
		if (!resp.body.status) {
			errmsg =
				"[ACME.js] (E_STATE_EMPTY) empty challenge state for '" +
				altname +
				"':" +
				JSON.stringify(resp.body);
		} else if ('invalid' === resp.body.status) {
			errmsg =
				"[ACME.js] (E_STATE_INVALID) challenge state for '" +
				altname +
				"': '" +
				//resp.body.status +
				JSON.stringify(resp.body) +
				"'";
		} else {
			errmsg =
				"[ACME.js] (E_STATE_UKN) challenge state for '" +
				altname +
				"': '" +
				resp.body.status +
				"'";
		}

		return Promise.reject(new Error(errmsg));
	}

	function transformError(e) {
		var err = e;
		if (err.urn) {
			err = new Error(
				'[acme-v2] ' +
					auth.altname +
					' status:' +
					e.status +
					' ' +
					e.detail
			);
			err.auth = auth;
			err.altname = auth.altname;
			err.type = auth.type;
			err.code =
				'invalid' === e.status ? 'E_ACME_CHALLENGE' : 'E_ACME_UNKNOWN';
		}

		throw err;
	}

	function respondToChallenge() {
		//#console.debug('[ACME.js] responding to accept challenge:');
		// POST-as-POST (empty JSON object)
		return U._jwsRequest(me, {
			accountKey: options.accountKey,
			url: auth.url,
			protected: { kid: kid },
			payload: Enc.strToBuf(JSON.stringify({}))
		})
			.then(checkResult)
			.catch(transformError);
	}

	return respondToChallenge();
};

// options = { domains, claims, challenges }
ACME._setChallenges = function(me, options, order) {
	var claims = order._claims.slice(0);
	var valids = [];
	var auths = [];
	var placed = [];
	var USE_DNS = false;
	var DNS_DELAY = 0;

	// Set any challenges, excpting ones that have already been validated
	function setNext() {
		var claim = claims.shift();
		// check false for testing
		if (!claim || false === options.challenges) {
			return Promise.resolve();
		}

		return Promise.resolve()
			.then(function() {
				// For any challenges that are already valid,
				// add to the list and skip any checks.
				if (
					claim.challenges.some(function(ch) {
						if ('valid' === ch.status) {
							valids.push(ch);
							return true;
						}
					})
				) {
					return;
				}

				var selected = ACME._chooseChallenge(options, claim);
				if (!selected) {
					throw E.NO_SUITABLE_CHALLENGE(
						claim.altname,
						claim.challenges,
						options._presenterTypes
					);
				}
				auths.push(selected);
				placed.push(selected);
				ACME._notify(me, options, 'challenge_select', {
					// API-locked
					altname: ACME._untame(
						claim.identifier.value,
						claim.wildcard
					),
					type: selected.type,
					dnsHost: selected.dnsHost,
					keyAuthorization: selected.keyAuthorization
				});
				ACME._notify(me, options, '_challenge_select', {
					altname: ACME._untame(
						claim.identifier.value,
						claim.wildcard
					),
					type: selected.type,
					challenge: selected
				});

				// Set a delay for nameservers a moment to propagate
				if ('dns-01' === selected.type) {
					if (options.challenges['dns-01'] && !USE_DNS) {
						USE_DNS = true;
						DNS_DELAY = parseInt(
							options.challenges['dns-01'].propagationDelay,
							10
						);
					}
				}

				var ch = options.challenges[selected.type] || {};
				if (!ch.set) {
					throw new Error('no handler for setting challenge');
				}
				return ch.set({ challenge: selected });
			})
			.then(setNext);
	}

	function waitAll() {
		//#console.debug('\n[DEBUG] waitChallengeDelay %s\n', DELAY);
		if (!DNS_DELAY || DNS_DELAY <= 0) {
			DNS_DELAY = 5000;
		}
		return ACME._wait(DNS_DELAY);
	}

	function checkNext() {
		var auth = auths.shift();
		if (!auth) {
			return Promise.resolve(valids);
		}

		// These are not as much "valids" as they are "not invalids"
		if (!me._canCheck[auth.type] || me.skipChallengeTest) {
			valids.push(auth);
			return checkNext();
		}

		return ACME.challengeTests[auth.type](me, { challenge: auth })
			.then(function() {
				valids.push(auth);
			})
			.then(checkNext);
	}

	function removeAll(ch) {
		options.challenges[ch.type]
			.remove({ challenge: ch })
			.catch(function(err) {
				err.action = 'challenge_remove';
				err.altname = ch.altname;
				err.type = ch.type;
				ACME._notify(me, options, 'error', err);
			});
	}

	// The reason we set every challenge in a batch first before checking any
	// is so that we don't poison our own DNS cache with misses.
	return setNext()
		.then(waitAll)
		.then(checkNext)
		.catch(function(err) {
			if (!options.debug) {
				placed.forEach(removeAll);
			}
			throw err;
		});
};

ACME._presentChallenges = function(me, options, kid, readyToPresent) {
	// Actually sets the challenge via ACME
	function challengeNext() {
		// First set, First presented
		var auth = readyToPresent.shift();
		if (!auth) {
			return Promise.resolve();
		}
		return ACME._postChallenge(me, options, kid, auth).then(challengeNext);
	}

	// BTW, these are done serially rather than parallel on purpose
	// (rate limits, propagation delays, etc)
	return challengeNext().then(function() {
		return readyToPresent;
	});
};

ACME._pollOrderStatus = function(me, options, kid, order, verifieds) {
	var csr64 = ACME._csrToUrlBase64(options.csr);
	var body = { csr: csr64 };
	var payload = JSON.stringify(body);

	function pollCert() {
		//#console.debug('[ACME.js] pollCert:', order._finalizeUrl);
		return U._jwsRequest(me, {
			accountKey: options.accountKey,
			url: order._finalizeUrl,
			protected: { kid: kid },
			payload: Enc.strToBuf(payload)
		}).then(function(resp) {
			ACME._notify(me, options, 'certificate_status', {
				subject: options.domains[0],
				status: resp.body.status
			});

			// https://tools.ietf.org/html/draft-ietf-acme-acme-12#section-7.1.3
			// Possible values are: "pending" => ("invalid" || "ready") => "processing" => "valid"
			if ('valid' === resp.body.status) {
				var voucher = resp.body;
				voucher._certificateUrl = resp.body.certificate;

				return voucher;
			}

			if ('processing' === resp.body.status) {
				return ACME._wait().then(pollCert);
			}

			if (me.debug) {
				console.debug(
					'Error: bad status:\n' + JSON.stringify(resp.body, null, 2)
				);
			}

			if ('pending' === resp.body.status) {
				return Promise.reject(
					new Error(
						"Did not finalize order: status 'pending'." +
							' Best guess: You have not accepted at least one challenge for each domain:\n' +
							"Requested: '" +
							options.domains.join(', ') +
							"'\n" +
							"Validated: '" +
							verifieds.join(', ') +
							"'\n" +
							JSON.stringify(resp.body, null, 2)
					)
				);
			}

			if ('invalid' === resp.body.status) {
				return Promise.reject(
					E.ORDER_INVALID(options, verifieds, resp)
				);
			}

			if ('ready' === resp.body.status) {
				return Promise.reject(
					E.DOUBLE_READY_ORDER(options, verifieds, resp)
				);
			}

			return Promise.reject(
				E.UNHANDLED_ORDER_STATUS(options, verifieds, resp)
			);
		});
	}

	return pollCert();
};

ACME._redeemCert = function(me, options, kid, voucher) {
	//#console.debug('ACME.js: order was finalized');

	// POST-as-GET
	return U._jwsRequest(me, {
		accountKey: options.accountKey,
		url: voucher._certificateUrl,
		protected: { kid: kid },
		payload: Enc.binToBuf(''),
		json: true
	}).then(function(resp) {
		//#console.debug('ACME.js: csr submitted and cert received:');

		// https://github.com/certbot/certbot/issues/5721
		var certsarr = ACME.splitPemChain(ACME.formatPemChain(resp.body || ''));
		//  cert, chain, fullchain, privkey, /*TODO, subject, altnames, issuedAt, expiresAt */
		var certs = {
			expires: voucher.expires,
			identifiers: voucher.identifiers,
			//, authorizations: order.authorizations
			cert: certsarr.shift(),
			//, privkey: privkeyPem
			chain: certsarr.join('\n')
		};
		//#console.debug(certs);
		return certs;
	});
};

ACME._finalizeOrder = function(me, options, kid, order) {
	//#console.debug('[ACME.js] finalizeOrder:');
	var readyToPresent;
	return A._getAccountKid(me, options).then(function(kid) {
		return ACME._setChallenges(me, options, order)
			.then(function(_readyToPresent) {
				readyToPresent = _readyToPresent;
				return ACME._presentChallenges(
					me,
					options,
					kid,
					readyToPresent
				);
			})
			.then(function() {
				return ACME._pollOrderStatus(
					me,
					options,
					kid,
					order,
					readyToPresent.map(function(ch) {
						return ACME._untame(ch.identifier.value, ch.wildcard);
					})
				);
			})
			.then(function(voucher) {
				return ACME._redeemCert(me, options, kid, voucher);
			});
	});
};

// Order a certificate request with all domains
ACME._orderCert = function(me, options, kid) {
	var certificateRequest = {
		// raw wildcard syntax MUST be used here
		identifiers: options.domains.map(function(hostname) {
			return { type: 'dns', value: hostname };
		})
		//, "notBefore": "2016-01-01T00:00:00Z"
		//, "notAfter": "2016-01-08T00:00:00Z"
	};

	return ACME._prepRequest(me, options)
		.then(function() {
			return ACME._getZones(me, options.challenges, options.domains);
		})
		.then(function(zonenames) {
			var p;
			// Do a little dry-run / self-test
			if (!me.skipDryRun && !options.skipDryRun) {
				p = ACME._dryRun(me, options, zonenames);
			} else {
				p = Promise.resolve(null);
			}

			return p.then(function() {
				return A._getAccountKid(me, options)
					.then(function(kid) {
						ACME._notify(me, options, 'certificate_order', {
							// API-locked
							account: { key: { kid: kid } },
							subject: options.domains[0],
							altnames: options.domains,
							challengeTypes: options._presenterTypes
						});

						var payload = JSON.stringify(certificateRequest);
						//#console.debug('\n[DEBUG] newOrder\n');
						return U._jwsRequest(me, {
							accountKey: options.accountKey,
							url: me._directoryUrls.newOrder,
							protected: { kid: kid },
							payload: Enc.binToBuf(payload)
						});
					})
					.then(function(resp) {
						var order = resp.body;
						order._orderUrl = resp.headers.location;
						order._finalizeUrl = resp.body.finalize;
						order._identifiers = certificateRequest.identifiers;
						//#console.debug('[ordered]', location); // the account id url
						//#console.debug(resp);

						if (!order.authorizations) {
							return Promise.reject(
								E.NO_AUTHORIZATIONS(options, resp)
							);
						}

						return order;
					})
					.then(function(order) {
						return ACME._getAllChallenges(
							me,
							options,
							kid,
							zonenames,
							order
						).then(function(claims) {
							order._claims = claims;
							return order;
						});
					});
			});
		});
};

ACME._prepRequest = function(me, options) {
	return Promise.resolve().then(function() {
		// TODO check that all presenterTypes are represented in challenges
		if (!options._presenterTypes.length) {
			return Promise.reject(
				new Error('options.challenges must be specified')
			);
		}

		if (!options.csr) {
			throw new Error(
				'no `csr` option given (should be in DER or PEM format)'
			);
		}
		// TODO validate csr signature?
		var _csr = CSR._info(options.csr);
		options.domains = options.domains || _csr.altnames;
		_csr.altnames = _csr.altnames || [];
		if (
			options.domains
				.slice(0)
				.sort()
				.join(' ') !==
			_csr.altnames
				.slice(0)
				.sort()
				.join(' ')
		) {
			return Promise.reject(
				new Error('certificate altnames do not match requested domains')
			);
		}
		if (_csr.subject !== options.domains[0]) {
			return Promise.reject(
				new Error(
					'certificate subject (commonName) does not match first altname (SAN)'
				)
			);
		}
		if (!(options.domains && options.domains.length)) {
			return Promise.reject(
				new Error(
					'options.domains must be a list of string domain names,' +
						' with the first being the subject of the certificate'
				)
			);
		}

		// a cheap check to see if there are non-ascii characters in any of the domains
		var nonAsciiDomains = options.domains.some(function(d) {
			// IDN / unicode / utf-8 / punycode
			return Enc.strToBin(d) !== d;
		});
		if (nonAsciiDomains) {
			throw new Error(
				"please use the 'punycode' module to convert unicode domain names to punycode"
			);
		}

		// TODO Promise.all()?
		(options._presenterTypes || []).forEach(function(key) {
			var presenter = options.challenges[key];
			if (
				'function' === typeof presenter.init &&
				!presenter._acme_initialized
			) {
				presenter._acme_initialized = true;
				return presenter.init({ type: '*', request: me.request });
			}
		});
	});
};

// Request a challenge for each authorization in the order
ACME._getAllChallenges = function(me, options, kid, zonenames, order) {
	var claims = [];
	//#console.debug("[acme-v2] POST newOrder has authorizations");
	var challengeAuths = order.authorizations.slice(0);

	function getNext() {
		var authUrl = challengeAuths.shift();
		if (!authUrl) {
			return claims;
		}

		return ACME._getAuthorization(
			me,
			options,
			kid,
			zonenames,
			authUrl
		).then(function(claim) {
			// var domain = options.domains[i]; // claim.identifier.value
			claims.push(claim);
			return getNext();
		});
	}

	return getNext().then(function() {
		return claims;
	});
};

ACME.formatPemChain = function formatPemChain(str) {
	return (
		str
			.trim()
			.replace(/[\r\n]+/g, '\n')
			.replace(/\-\n\-/g, '-\n\n-') + '\n'
	);
};

ACME.splitPemChain = function splitPemChain(str) {
	return str
		.trim()
		.split(/[\r\n]{2,}/g)
		.map(function(str) {
			return str + '\n';
		});
};

ACME._csrToUrlBase64 = function(csr) {
	// if der, convert to base64
	if ('string' !== typeof csr) {
		csr = Enc.bufToUrlBase64(csr);
	}

	// TODO use PEM.parseBlock()
	// nix PEM headers, if any
	if ('-' === csr[0]) {
		csr = csr
			.split(/\n+/)
			.slice(1, -1)
			.join('');
	}
	return Enc.base64ToUrlBase64(csr.trim().replace(/\s+/g, ''));
};

// In v8 this is crypto random, but we're just using it for pseudorandom
ACME._prnd = function(n) {
	var rnd = '';
	while (rnd.length / 2 < n) {
		var i = Math.random()
			.toString()
			.substr(2);
		var h = parseInt(i, 10).toString(16);
		if (h.length % 2) {
			h = '0' + h;
		}
		rnd += h;
	}
	return rnd.substr(0, n * 2);
};

ACME._notify = function(me, options, ev, params) {
	if (!options.notify && !me.notify) {
		//console.info(ev, params);
		return;
	}
	try {
		(options.notify || me.notify)(ev, params);
	} catch (e) {
		console.error('`acme.notify(ev, params)` Error:');
		console.error(e);
	}
};

ACME._wait = function wait(ms) {
	return new Promise(function(resolve) {
		setTimeout(resolve, ms || 1100);
	});
};

function newZoneRegExp(zonename) {
	// (^|\.)example\.com$
	// which matches:
	//  foo.example.com
	//  example.com
	// but not:
	//  fooexample.com
	return new RegExp('(^|\\.)' + zonename.replace(/\./g, '\\.') + '$');
}

function pluckZone(zonenames, dnsHost) {
	return zonenames
		.filter(function(zonename) {
			// the only character that needs to be escaped for regex
			// and is allowed in a domain name is '.'
			return newZoneRegExp(zonename).test(dnsHost);
		})
		.sort(function(a, b) {
			// longest match first
			return b.length - a.length;
		})[0];
}
