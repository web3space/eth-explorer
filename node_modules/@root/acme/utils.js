'use strict';

var U = module.exports;

var Keypairs = require('@root/keypairs');
var UserAgent = require('./lib/node/client-user-agent.js');

// Handle nonce, signing, and request altogether
U._jwsRequest = function(me, bigopts) {
	return U._getNonce(me).then(function(nonce) {
		bigopts.protected.nonce = nonce;
		bigopts.protected.url = bigopts.url;
		// protected.alg: added by Keypairs.signJws
		if (!bigopts.protected.jwk) {
			// protected.kid must be overwritten due to ACME's interpretation of the spec
			if (!('kid' in bigopts.protected)) {
				bigopts.protected.kid = bigopts.kid;
			}
		}

		// this will shasum the thumbprint the 2nd time
		return Keypairs.signJws({
			jwk: bigopts.accountKey,
			protected: bigopts.protected,
			payload: bigopts.payload
		})
			.then(function(jws) {
				//#console.debug('[ACME.js] url: ' + bigopts.url + ':');
				//#console.debug(jws);
				return U._request(me, { url: bigopts.url, json: jws });
			})
			.catch(function(e) {
				if (/badNonce$/.test(e.urn)) {
					// retry badNonces
					var retryable = bigopts._retries >= 2;
					if (!retryable) {
						bigopts._retries = (bigopts._retries || 0) + 1;
						return U._jwsRequest(me, bigopts);
					}
				}
				throw e;
			});
	});
};

U._getNonce = function(me) {
	var nonce;
	while (true) {
		nonce = me._nonces.shift();
		if (!nonce) {
			break;
		}
		if (Date.now() - nonce.createdAt > 15 * 60 * 1000) {
			nonce = null;
		} else {
			break;
		}
	}
	if (nonce) {
		return Promise.resolve(nonce.nonce);
	}

	// HEAD-as-HEAD ok
	return U._request(me, {
		method: 'HEAD',
		url: me._directoryUrls.newNonce
	}).then(function(resp) {
		return resp.headers['replay-nonce'];
	});
};

// Handle some ACME-specific defaults
U._request = function(me, opts) {
	// no-op on browser
	var ua = UserAgent.get(me, opts);

	// Note: the required User-Agent string will be set in node, but not browsers
	if (!opts.headers) {
		opts.headers = {};
	}

	if (ua && !opts.headers['User-Agent']) {
		opts.headers['User-Agent'] = ua;
	}
	if (opts.json) {
		opts.headers.Accept = 'application/json';
		if (true !== opts.json) {
			opts.body = JSON.stringify(opts.json);
		}
		if (/*opts.jose ||*/ opts.json.protected) {
			opts.headers['Content-Type'] = 'application/jose+json';
		}
	}
	if (!opts.method) {
		opts.method = 'GET';
		if (opts.body) {
			opts.method = 'POST';
		}
	}

	//console.log('\n[debug] REQUEST');
	//console.log(opts);
	return me.__request(opts).then(function(resp) {
		if (resp.toJSON) {
			resp = resp.toJSON();
		}
		if (resp.headers['replay-nonce']) {
			U._setNonce(me, resp.headers['replay-nonce']);
		}
		//console.log('[debug] RESPONSE:');
		//console.log(resp.headers);
		//console.log(resp.body);

		var e;
		var err;
		if (resp.body) {
			err = resp.body.error;
			e = new Error('');
			if (400 === resp.body.status) {
				err = { type: resp.body.type, detail: resp.body.detail };
			}
			if (err) {
				e.status = resp.body.status;
				e.code = 'E_ACME';
				if (e.status) {
					e.message = '[' + e.status + '] ';
				}
				e.detail = err.detail;
				e.message += err.detail || JSON.stringify(err);
				e.urn = err.type;
				e.uri = resp.body.url;
				e._rawError = err;
				e._rawBody = resp.body;
				throw e;
			}
		}

		return resp;
	});
};

U._setNonce = function(me, nonce) {
	me._nonces.unshift({ nonce: nonce, createdAt: Date.now() });
};

U._importKeypair = function(key) {
	var p;
	var pub;

	if (key && key.kty) {
		// nix the browser jwk extras
		key.key_ops = undefined;
		key.ext = undefined;
		pub = Keypairs.neuter({ jwk: key });
		p = Promise.resolve({
			private: key,
			public: pub
		});
	} else if ('string' === typeof key) {
		p = Keypairs.import({ pem: key });
	} else {
		throw new Error('no private key given');
	}

	return p.then(function(pair) {
		if (pair.public.kid) {
			pair = JSON.parse(JSON.stringify(pair));
			delete pair.public.kid;
			delete pair.private.kid;
		}
		return pair;
	});
};
