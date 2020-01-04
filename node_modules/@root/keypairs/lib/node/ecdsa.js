'use strict';

var native = module.exports;
// XXX provided by caller: import, export
var EC = native;
// TODO SSH

native.generate = function(opts) {
	return Promise.resolve().then(function() {
		var typ = 'ec';
		var format = opts.format;
		var encoding = opts.encoding;
		var priv;
		var pub = 'spki';

		if (!format) {
			format = 'jwk';
		}
		if (-1 !== ['spki', 'pkcs8', 'ssh'].indexOf(format)) {
			format = 'pkcs8';
		}

		if ('pem' === format) {
			format = 'sec1';
			encoding = 'pem';
		} else if ('der' === format) {
			format = 'sec1';
			encoding = 'der';
		}

		if ('jwk' === format || 'json' === format) {
			format = 'jwk';
			encoding = 'json';
		} else {
			priv = format;
		}

		if (!encoding) {
			encoding = 'pem';
		}

		if (priv) {
			priv = { type: priv, format: encoding };
			pub = { type: pub, format: encoding };
		} else {
			// jwk
			priv = { type: 'sec1', format: 'pem' };
			pub = { type: 'spki', format: 'pem' };
		}

		return new Promise(function(resolve, reject) {
			return require('crypto').generateKeyPair(
				typ,
				{
					namedCurve: opts.crv || opts.namedCurve || 'P-256',
					privateKeyEncoding: priv,
					publicKeyEncoding: pub
				},
				function(err, pubkey, privkey) {
					if (err) {
						reject(err);
					}
					resolve({
						private: privkey,
						public: pubkey
					});
				}
			);
		}).then(function(keypair) {
			if ('jwk' === format) {
				return Promise.all([
					native.import({
						pem: keypair.private,
						format: priv.type
					}),
					native.import({
						pem: keypair.public,
						format: pub.type,
						public: true
					})
				]).then(function(pair) {
					return {
						private: pair[0],
						public: pair[1]
					};
				});
			}

			if ('ssh' !== opts.format) {
				return keypair;
			}

			return native
				.import({
					pem: keypair.public,
					format: format,
					public: true
				})
				.then(function(jwk) {
					return EC.export({
						jwk: jwk,
						format: opts.format,
						public: true
					}).then(function(pub) {
						return {
							private: keypair.private,
							public: pub
						};
					});
				});
		});
	});
};
