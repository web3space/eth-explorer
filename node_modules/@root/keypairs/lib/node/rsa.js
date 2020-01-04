'use strict';

var native = module.exports;

// XXX provided by caller: export
var RSA = native;
var PEM = require('@root/pem');
var X509 = require('@root/x509');

native.generate = function(opts) {
	opts.kty = 'RSA';
	return native._generate(opts).then(function(pair) {
		var format = opts.format;
		var encoding = opts.encoding;

		// The easy way
		if ('json' === format && !encoding) {
			format = 'jwk';
			encoding = 'json';
		}
		if (
			('jwk' === format || !format) &&
			('json' === encoding || !encoding)
		) {
			return pair;
		}
		if ('jwk' === format || 'json' === encoding) {
			throw new Error(
				"format '" +
					format +
					"' is incompatible with encoding '" +
					encoding +
					"'"
			);
		}

		// The... less easy way
		/*
    var priv;
    var pub;

    if ('spki' === format || 'pkcs8' === format) {
      format = 'pkcs8';
      pub = 'spki';
    }

    if ('pem' === format) {
      format = 'pkcs1';
      encoding = 'pem';
    } else if ('der' === format) {
      format = 'pkcs1';
      encoding = 'der';
    }

    priv = format;
    pub = pub || format;

    if (!encoding) {
      encoding = 'pem';
    }

    if (priv) {
      priv = { type: priv, format: encoding };
      pub = { type: pub, format: encoding };
    } else {
      // jwk
      priv = { type: 'pkcs1', format: 'pem' };
      pub = { type: 'pkcs1', format: 'pem' };
    }
    */
		if (('pem' === format || 'der' === format) && !encoding) {
			encoding = format;
			format = 'pkcs1';
		}

		var exOpts = { jwk: pair.private, format: format, encoding: encoding };
		return RSA.export(exOpts).then(function(priv) {
			exOpts.public = true;
			if ('pkcs8' === exOpts.format) {
				exOpts.format = 'spki';
			}
			return RSA.export(exOpts).then(function(pub) {
				return { private: priv, public: pub };
			});
		});
	});
};

native._generate = function(opts) {
	if (!opts) {
		opts = {};
	}
	return new Promise(function(resolve, reject) {
		try {
			var modlen = opts.modulusLength || 2048;
			var exp = opts.publicExponent || 0x10001;
			var pair = require('./generate-privkey.js')(modlen, exp);
			if (pair.private) {
				resolve(pair);
				return;
			}
			pair = toJwks(pair);
			resolve({ private: pair.private, public: pair.public });
		} catch (e) {
			reject(e);
		}
	});
};

// PKCS1 to JWK only
function toJwks(oldpair) {
	var block = PEM.parseBlock(oldpair.privateKeyPem);
	var jwk = { kty: 'RSA', n: null, e: null };
	jwk = X509.parsePkcs1(block.bytes, jwk);
	return { private: jwk, public: RSA.neuter({ jwk: jwk }) };
}
