'use strict';

var native = module.exports;
// XXX received from caller
var EC = native;

native.generate = function(opts) {
	var wcOpts = {};
	if (!opts) {
		opts = {};
	}
	if (!opts.kty) {
		opts.kty = 'EC';
	}

	// ECDSA has only the P curves and an associated bitlength
	wcOpts.name = 'ECDSA';
	if (!opts.namedCurve) {
		opts.namedCurve = 'P-256';
	}
	wcOpts.namedCurve = opts.namedCurve; // true for supported curves
	if (/256/.test(wcOpts.namedCurve)) {
		wcOpts.namedCurve = 'P-256';
		wcOpts.hash = { name: 'SHA-256' };
	} else if (/384/.test(wcOpts.namedCurve)) {
		wcOpts.namedCurve = 'P-384';
		wcOpts.hash = { name: 'SHA-384' };
	} else {
		return Promise.Reject(
			new Error(
				"'" +
					wcOpts.namedCurve +
					"' is not an NIST approved ECDSA namedCurve. " +
					" Please choose either 'P-256' or 'P-384'. " +
					// XXX received from caller
					EC._stance
			)
		);
	}

	var extractable = true;
	return window.crypto.subtle
		.generateKey(wcOpts, extractable, ['sign', 'verify'])
		.then(function(result) {
			return window.crypto.subtle
				.exportKey('jwk', result.privateKey)
				.then(function(privJwk) {
					privJwk.key_ops = undefined;
					privJwk.ext = undefined;
					return {
						private: privJwk,
						// XXX received from caller
						public: EC.neuter({ jwk: privJwk })
					};
				});
		});
};
