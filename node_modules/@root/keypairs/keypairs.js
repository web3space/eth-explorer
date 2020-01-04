/*global Promise*/
'use strict';

require('@root/encoding/bytes');
var Enc = require('@root/encoding/base64');

var Keypairs = module.exports;
var Rasha = require('./rsa.js');
var Eckles = require('./ecdsa.js');
var native = require('./lib/node/keypairs.js');

Keypairs.parse = function(opts) {
	opts = opts || {};

	var err;
	var jwk;
	var pem;
	var p;

	if (!opts.key || !opts.key.kty) {
		try {
			jwk = JSON.parse(opts.key);
			p = Keypairs.export({ jwk: jwk })
				.catch(function(e) {
					pem = opts.key;
					err = new Error(
						"Not a valid jwk '" +
							JSON.stringify(jwk) +
							"':" +
							e.message
					);
					err.code = 'EINVALID';
					return Promise.reject(err);
				})
				.then(function() {
					return jwk;
				});
		} catch (e) {
			p = Keypairs.import({ pem: opts.key }).catch(function(e) {
				err = new Error(
					'Could not parse key (type ' +
						typeof opts.key +
						") '" +
						opts.key +
						"': " +
						e.message
				);
				err.code = 'EPARSE';
				return Promise.reject(err);
			});
		}
	} else {
		p = Promise.resolve(opts.key);
	}

	return p.then(function(jwk) {
		var pubopts = JSON.parse(JSON.stringify(opts));
		pubopts.jwk = jwk;
		return Keypairs.publish(pubopts).then(function(pub) {
			// 'd' happens to be the name of a private part of both RSA and ECDSA keys
			if (opts.public || opts.publish || !jwk.d) {
				if (opts.private) {
					// TODO test that it can actually sign?
					err = new Error(
						"Not a private key '" + JSON.stringify(jwk) + "'"
					);
					err.code = 'ENOTPRIVATE';
					return Promise.reject(err);
				}
				return { public: pub };
			} else {
				return { private: jwk, public: pub };
			}
		});
	});
};

Keypairs.parseOrGenerate = function(opts) {
	if (!opts.key) {
		return Keypairs.generate(opts);
	}
	opts.private = true;
	return Keypairs.parse(opts).catch(function(e) {
		return Keypairs.generate(opts).then(function(pair) {
			pair.parseError = e;
			return pair;
		});
	});
};

Keypairs._stance =
	"We take the stance that if you're knowledgeable enough to" +
	" properly and securely use non-standard crypto then you shouldn't need Bluecrypt anyway.";
Keypairs._universal =
	'Bluecrypt only supports crypto with standard cross-browser and cross-platform support.';
Keypairs.generate = function(opts) {
	opts = opts || {};
	var p;
	if (!opts.kty) {
		opts.kty = opts.type;
	}
	if (!opts.kty) {
		opts.kty = 'EC';
	}
	if (/^EC/i.test(opts.kty)) {
		p = Eckles.generate(opts);
	} else if (/^RSA$/i.test(opts.kty)) {
		p = Rasha.generate(opts);
	} else {
		return Promise.Reject(
			new Error(
				"'" +
					opts.kty +
					"' is not a well-supported key type." +
					Keypairs._universal +
					" Please choose 'EC', or 'RSA' if you have good reason to."
			)
		);
	}
	return p.then(function(pair) {
		return Keypairs.thumbprint({ jwk: pair.public }).then(function(thumb) {
			pair.private.kid = thumb; // maybe not the same id on the private key?
			pair.public.kid = thumb;
			return pair;
		});
	});
};

Keypairs.import = function(opts) {
	return Eckles.import(opts)
		.catch(function() {
			return Rasha.import(opts);
		})
		.then(function(jwk) {
			return Keypairs.thumbprint({ jwk: jwk }).then(function(thumb) {
				jwk.kid = thumb;
				return jwk;
			});
		});
};

Keypairs.export = function(opts) {
	return Eckles.export(opts).catch(function(err) {
		return Rasha.export(opts).catch(function() {
			return Promise.reject(err);
		});
	});
};
// XXX
native.export = Keypairs.export;

/**
 * Chopping off the private parts is now part of the public API.
 * I thought it sounded a little too crude at first, but it really is the best name in every possible way.
 */
Keypairs.neuter = function(opts) {
	/** trying to find the best balance of an immutable copy with custom attributes */
	var jwk = {};
	Object.keys(opts.jwk).forEach(function(k) {
		if ('undefined' === typeof opts.jwk[k]) {
			return;
		}
		// ignore RSA and EC private parts
		if (-1 !== ['d', 'p', 'q', 'dp', 'dq', 'qi'].indexOf(k)) {
			return;
		}
		jwk[k] = JSON.parse(JSON.stringify(opts.jwk[k]));
	});
	return jwk;
};

Keypairs.thumbprint = function(opts) {
	return Promise.resolve().then(function() {
		if (/EC/i.test(opts.jwk.kty)) {
			return Eckles.thumbprint(opts);
		} else {
			return Rasha.thumbprint(opts);
		}
	});
};

Keypairs.publish = function(opts) {
	if ('object' !== typeof opts.jwk || !opts.jwk.kty) {
		throw new Error('invalid jwk: ' + JSON.stringify(opts.jwk));
	}

	/** returns a copy */
	var jwk = Keypairs.neuter(opts);

	if (jwk.exp) {
		jwk.exp = setTime(jwk.exp);
	} else {
		if (opts.exp) {
			jwk.exp = setTime(opts.exp);
		} else if (opts.expiresIn) {
			jwk.exp = Math.round(Date.now() / 1000) + opts.expiresIn;
		} else if (opts.expiresAt) {
			jwk.exp = opts.expiresAt;
		}
	}
	if (!jwk.use && false !== jwk.use) {
		jwk.use = 'sig';
	}

	if (jwk.kid) {
		return Promise.resolve(jwk);
	}
	return Keypairs.thumbprint({ jwk: jwk }).then(function(thumb) {
		jwk.kid = thumb;
		return jwk;
	});
};

// JWT a.k.a. JWS with Claims using Compact Serialization
Keypairs.signJwt = function(opts) {
	return Keypairs.thumbprint({ jwk: opts.jwk }).then(function(thumb) {
		var header = opts.header || {};
		var claims = JSON.parse(JSON.stringify(opts.claims || {}));
		header.typ = 'JWT';

		if (!header.kid && false !== header.kid) {
			header.kid = thumb;
		}
		if (!header.alg && opts.alg) {
			header.alg = opts.alg;
		}
		if (!claims.iat && (false === claims.iat || false === opts.iat)) {
			claims.iat = undefined;
		} else if (!claims.iat) {
			claims.iat = Math.round(Date.now() / 1000);
		}

		if (opts.exp) {
			claims.exp = setTime(opts.exp);
		} else if (
			!claims.exp &&
			(false === claims.exp || false === opts.exp)
		) {
			claims.exp = undefined;
		} else if (!claims.exp) {
			throw new Error(
				"opts.claims.exp should be the expiration date as seconds, human form (i.e. '1h' or '15m') or false"
			);
		}

		if (opts.iss) {
			claims.iss = opts.iss;
		}
		if (!claims.iss && (false === claims.iss || false === opts.iss)) {
			claims.iss = undefined;
		} else if (!claims.iss) {
			throw new Error(
				'opts.claims.iss should be in the form of https://example.com/, a secure OIDC base url'
			);
		}

		return Keypairs.signJws({
			jwk: opts.jwk,
			pem: opts.pem,
			protected: header,
			header: undefined,
			payload: claims
		}).then(function(jws) {
			return [jws.protected, jws.payload, jws.signature].join('.');
		});
	});
};

Keypairs.signJws = function(opts) {
	return Keypairs.thumbprint(opts).then(function(thumb) {
		function alg() {
			if (!opts.jwk) {
				throw new Error("opts.jwk must exist and must declare 'typ'");
			}
			if (opts.jwk.alg) {
				return opts.jwk.alg;
			}
			var typ = 'RSA' === opts.jwk.kty ? 'RS' : 'ES';
			return typ + Keypairs._getBits(opts);
		}

		function sign() {
			var protect = opts.protected;
			var payload = opts.payload;

			// Compute JWS signature
			var protectedHeader = '';
			// Because unprotected headers are allowed, regrettably...
			// https://stackoverflow.com/a/46288694
			if (false !== protect) {
				if (!protect) {
					protect = {};
				}
				if (!protect.alg) {
					protect.alg = alg();
				}
				// There's a particular request where ACME / Let's Encrypt explicitly doesn't use a kid
				if (false === protect.kid) {
					protect.kid = undefined;
				} else if (!protect.kid) {
					protect.kid = thumb;
				}
				protectedHeader = JSON.stringify(protect);
			}

			// Not sure how to handle the empty case since ACME POST-as-GET must be empty
			//if (!payload) {
			//  throw new Error("opts.payload should be JSON, string, or ArrayBuffer (it may be empty, but that must be explicit)");
			//}
			// Trying to detect if it's a plain object (not Buffer, ArrayBuffer, Array, Uint8Array, etc)
			if (
				payload &&
				'string' !== typeof payload &&
				'undefined' === typeof payload.byteLength &&
				'undefined' === typeof payload.buffer
			) {
				payload = JSON.stringify(payload);
			}
			// Converting to a buffer, even if it was just converted to a string
			if ('string' === typeof payload) {
				payload = Enc.strToBuf(payload);
			}

			var protected64 = Enc.strToUrlBase64(protectedHeader);
			var payload64 = Enc.bufToUrlBase64(payload);
			var msg = protected64 + '.' + payload64;

			return native._sign(opts, msg).then(function(buf) {
				var signedMsg = {
					protected: protected64,
					payload: payload64,
					signature: Enc.bufToUrlBase64(buf)
				};

				return signedMsg;
			});
		}

		if (opts.jwk) {
			return sign();
		} else {
			return Keypairs.import({ pem: opts.pem }).then(function(pair) {
				opts.jwk = pair.private;
				return sign();
			});
		}
	});
};

// TODO expose consistently
Keypairs.sign = native._sign;

Keypairs._getBits = function(opts) {
	if (opts.alg) {
		return opts.alg.replace(/[a-z\-]/gi, '');
	}
	if (opts.protected && opts.protected.alg) {
		return opts.protected.alg.replace(/[a-z\-]/gi, '');
	}
	// base64 len to byte len
	var len = Math.floor((opts.jwk.n || '').length * 0.75);

	// TODO this may be a bug
	// need to confirm that the padding is no more or less than 1 byte
	if (/521/.test(opts.jwk.crv) || len >= 511) {
		return '512';
	} else if (/384/.test(opts.jwk.crv) || len >= 383) {
		return '384';
	}

	return '256';
};
// XXX
native._getBits = Keypairs._getBits;

function setTime(time) {
	if ('number' === typeof time) {
		return time;
	}

	var t = time.match(/^(\-?\d+)([dhms])$/i);
	if (!t || !t[0]) {
		throw new Error(
			"'" +
				time +
				"' should be datetime in seconds or human-readable format (i.e. 3d, 1h, 15m, 30s"
		);
	}

	var now = Math.round(Date.now() / 1000);
	var num = parseInt(t[1], 10);
	var unit = t[2];
	var mult = 1;
	switch (unit) {
		// fancy fallthrough, what fun!
		case 'd':
			mult *= 24;
		/*falls through*/
		case 'h':
			mult *= 60;
		/*falls through*/
		case 'm':
			mult *= 60;
		/*falls through*/
		case 's':
			mult *= 1;
	}

	return now + mult * num;
}
