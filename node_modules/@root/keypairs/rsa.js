/*global Promise*/
'use strict';

var RSA = module.exports;
var native = require('./lib/node/rsa.js');
var X509 = require('@root/x509');
var PEM = require('@root/pem');
//var SSH = require('./ssh-keys.js');
var sha2 = require('./lib/node/sha2.js');
var Enc = require('@root/encoding/base64');

RSA._universal =
	'Bluecrypt only supports crypto with standard cross-browser and cross-platform support.';
RSA._stance =
	"We take the stance that if you're knowledgeable enough to" +
	" properly and securely use non-standard crypto then you shouldn't need Bluecrypt anyway.";
native._stance = RSA._stance;

RSA.generate = native.generate;

// Chopping off the private parts is now part of the public API.
// I thought it sounded a little too crude at first, but it really is the best name in every possible way.
RSA.neuter = function(opts) {
	// trying to find the best balance of an immutable copy with custom attributes
	var jwk = {};
	Object.keys(opts.jwk).forEach(function(k) {
		if ('undefined' === typeof opts.jwk[k]) {
			return;
		}
		// ignore RSA private parts
		if (-1 !== ['d', 'p', 'q', 'dp', 'dq', 'qi'].indexOf(k)) {
			return;
		}
		jwk[k] = JSON.parse(JSON.stringify(opts.jwk[k]));
	});
	return jwk;
};
native.neuter = RSA.neuter;

// https://stackoverflow.com/questions/42588786/how-to-fingerprint-a-jwk
RSA.__thumbprint = function(jwk) {
	// Use the same entropy for SHA as for key
	var len = Math.floor(jwk.n.length * 0.75);
	var alg = 'SHA-256';
	// TODO this may be a bug
	// need to confirm that the padding is no more or less than 1 byte
	if (len >= 511) {
		alg = 'SHA-512';
	} else if (len >= 383) {
		alg = 'SHA-384';
	}
	return sha2
		.sum(alg, '{"e":"' + jwk.e + '","kty":"RSA","n":"' + jwk.n + '"}')
		.then(function(hash) {
			return Enc.bufToUrlBase64(Uint8Array.from(hash));
		});
};

RSA.thumbprint = function(opts) {
	return Promise.resolve().then(function() {
		var jwk;
		if ('EC' === opts.kty) {
			jwk = opts;
		} else if (opts.jwk) {
			jwk = opts.jwk;
		} else {
			return RSA.import(opts).then(function(jwk) {
				return RSA.__thumbprint(jwk);
			});
		}
		return RSA.__thumbprint(jwk);
	});
};

RSA.export = function(opts) {
	return Promise.resolve().then(function() {
		if (!opts || !opts.jwk || 'object' !== typeof opts.jwk) {
			throw new Error('must pass { jwk: jwk }');
		}
		var jwk = JSON.parse(JSON.stringify(opts.jwk));
		var format = opts.format;
		var pub = opts.public;
		if (pub || -1 !== ['spki', 'pkix', 'ssh', 'rfc4716'].indexOf(format)) {
			jwk = RSA.neuter({ jwk: jwk });
		}
		if ('RSA' !== jwk.kty) {
			throw new Error(
				"options.jwk.kty must be 'RSA' for RSA keys: " +
					JSON.stringify(jwk)
			);
		}
		if (!jwk.p) {
			// TODO test for n and e
			pub = true;
			if (!format || 'pkcs1' === format) {
				format = 'pkcs1';
			} else if (-1 !== ['spki', 'pkix'].indexOf(format)) {
				format = 'spki';
			} else if (-1 !== ['ssh', 'rfc4716'].indexOf(format)) {
				format = 'ssh';
			} else {
				throw new Error(
					"options.format must be 'spki', 'pkcs1', or 'ssh' for public RSA keys, not (" +
						typeof format +
						') ' +
						format
				);
			}
		} else {
			// TODO test for all necessary keys (d, p, q ...)
			if (!format || 'pkcs1' === format) {
				format = 'pkcs1';
			} else if ('pkcs8' !== format) {
				throw new Error(
					"options.format must be 'pkcs1' or 'pkcs8' for private RSA keys"
				);
			}
		}

		if ('pkcs1' === format) {
			if (jwk.d) {
				return PEM.packBlock({
					type: 'RSA PRIVATE KEY',
					bytes: X509.packPkcs1(jwk)
				});
			} else {
				return PEM.packBlock({
					type: 'RSA PUBLIC KEY',
					bytes: X509.packPkcs1(jwk)
				});
			}
		} else if ('pkcs8' === format) {
			return PEM.packBlock({
				type: 'PRIVATE KEY',
				bytes: X509.packPkcs8(jwk)
			});
		} else if (-1 !== ['spki', 'pkix'].indexOf(format)) {
			return PEM.packBlock({
				type: 'PUBLIC KEY',
				bytes: X509.packSpki(jwk)
			});
		} else if (-1 !== ['ssh', 'rfc4716'].indexOf(format)) {
			//return SSH.pack({ jwk: jwk, comment: opts.comment });
			throw new Error('not supported yet');
		} else {
			throw new Error(
				'Sanity Error: reached unreachable code block with format: ' +
					format
			);
		}
	});
};
native.export = RSA.export;

RSA.pack = function(opts) {
	// wrapped in a promise for API compatibility
	// with the forthcoming browser version
	// (and potential future native node capability)
	return Promise.resolve().then(function() {
		return RSA.export(opts);
	});
};

RSA._importSync = function(opts) {
	if (!opts || !opts.pem || 'string' !== typeof opts.pem) {
		throw new Error('must pass { pem: pem } as a string');
	}

	if (0 === opts.pem.indexOf('ssh-rsa ')) {
		//return SSH.parse(opts.pem, jwk);
		throw new Error('not supported, yet');
	}
	var pem = opts.pem;
	var block = PEM.parseBlock(pem);
	//var hex = toHex(u8);

	var jwk = X509._parseRsa(block.bytes);

	if (opts.public) {
		jwk = RSA.nueter(jwk);
	}
	return jwk;
};
RSA.parse = function parseRsa(opts) {
	// wrapped in a promise for API compatibility
	// with the forthcoming browser version
	// (and potential future native node capability)
	return Promise.resolve().then(function() {
		return RSA._importSync(opts);
	});
};
RSA.toJwk = RSA.import = RSA.parse;
