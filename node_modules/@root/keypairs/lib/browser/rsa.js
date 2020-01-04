'use strict';

var native = module.exports;
// XXX added by caller: _stance, neuter
var RSA = native;

native.generate = function(opts) {
	var wcOpts = {};
	if (!opts) {
		opts = {};
	}
	if (!opts.kty) {
		opts.kty = 'RSA';
	}

	// Support PSS? I don't think it's used for Let's Encrypt
	wcOpts.name = 'RSASSA-PKCS1-v1_5';
	if (!opts.modulusLength) {
		opts.modulusLength = 2048;
	}
	wcOpts.modulusLength = opts.modulusLength;
	if (wcOpts.modulusLength >= 2048 && wcOpts.modulusLength < 3072) {
		// erring on the small side... for no good reason
		wcOpts.hash = { name: 'SHA-256' };
	} else if (wcOpts.modulusLength >= 3072 && wcOpts.modulusLength < 4096) {
		wcOpts.hash = { name: 'SHA-384' };
	} else if (wcOpts.modulusLength < 4097) {
		wcOpts.hash = { name: 'SHA-512' };
	} else {
		// Public key thumbprints should be paired with a hash of similar length,
		// so anything above SHA-512's keyspace would be left under-represented anyway.
		return Promise.Reject(
			new Error(
				"'" +
					wcOpts.modulusLength +
					"' is not within the safe and universally" +
					' acceptable range of 2048-4096. Typically you should pick 2048, 3072, or 4096, though other values' +
					' divisible by 8 are allowed. ' +
					RSA._stance
			)
		);
	}
	// TODO maybe allow this to be set to any of the standard values?
	wcOpts.publicExponent = new Uint8Array([0x01, 0x00, 0x01]);

	var extractable = true;
	return window.crypto.subtle
		.generateKey(wcOpts, extractable, ['sign', 'verify'])
		.then(function(result) {
			return window.crypto.subtle
				.exportKey('jwk', result.privateKey)
				.then(function(privJwk) {
					return {
						private: privJwk,
						public: RSA.neuter({ jwk: privJwk })
					};
				});
		});
};
