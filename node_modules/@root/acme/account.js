'use strict';

var A = module.exports;
var U = require('./utils.js');

var Keypairs = require('@root/keypairs');
var Enc = require('@root/encoding/bytes');
var agreers = {};

A._getAccountKid = function(me, options) {
	// It's just fine if there's no account, we'll go get the key id we need via the existing key
	var kid =
		options.kid ||
		(options.account && (options.account.key && options.account.key.kid));

	if (kid) {
		return Promise.resolve(kid);
	}

	//return Promise.reject(new Error("must include KeyID"));
	// This is an idempotent request. It'll return the same account for the same public key.
	return A._registerAccount(me, options).then(function(account) {
		return account.key.kid;
	});
};

// ACME RFC Section 7.3 Account Creation
/*
 {
   "protected": base64url({
     "alg": "ES256",
     "jwk": {...},
     "nonce": "6S8IqOGY7eL2lsGoTZYifg",
     "url": "https://example.com/acme/new-account"
   }),
   "payload": base64url({
     "termsOfServiceAgreed": true,
     "onlyReturnExisting": false,
     "contact": [
       "mailto:cert-admin@example.com",
       "mailto:admin@example.com"
     ]
   }),
   "signature": "RZPOnYoPs1PhjszF...-nh6X1qtOFPB519I"
 }
*/
A._registerAccount = function(me, options) {
	//#console.debug('[ACME.js] accounts.create');

	function agree(agreed) {
		var err;
		if (!agreed) {
			err = new Error("must agree to '" + me._tos + "'");
			err.code = 'E_AGREE_TOS';
			throw err;
		}
		return true;
	}

	function getAccount() {
		return U._importKeypair(options.accountKey).then(function(pair) {
			var contact;
			if (options.contact) {
				contact = options.contact.slice(0);
			} else if (options.subscriberEmail) {
				contact = ['mailto:' + options.subscriberEmail];
			}

			var accountRequest = {
				termsOfServiceAgreed: true,
				onlyReturnExisting: false,
				contact: contact
			};

			var pub = pair.public;
			return attachExtAcc(pub, accountRequest).then(function(accReq) {
				var payload = JSON.stringify(accReq);
				return U._jwsRequest(me, {
					accountKey: options.accountKey,
					url: me._directoryUrls.newAccount,
					protected: { kid: false, jwk: pair.public },
					payload: Enc.strToBuf(payload)
				}).then(function(resp) {
					var account = resp.body;

					if (resp.statusCode < 200 || resp.statusCode >= 300) {
						if ('string' !== typeof account) {
							account = JSON.stringify(account);
						}
						throw new Error(
							'account error: ' +
								resp.statusCode +
								' ' +
								account +
								'\n' +
								payload
						);
					}

					// the account id url is the "kid"
					var kid = resp.headers.location;
					if (!account) {
						account = { _emptyResponse: true };
					}
					if (!account.key) {
						account.key = {};
					}
					account.key.kid = kid;
					return account;
				});
			});
		});
	}

	// for external accounts (probably useless, but spec'd)
	function attachExtAcc(pubkey, accountRequest) {
		if (!options.externalAccount) {
			return Promise.resolve(accountRequest);
		}

		return Keypairs.signJws({
			// TODO is HMAC the standard, or is this arbitrary?
			secret: options.externalAccount.secret,
			protected: {
				alg: options.externalAccount.alg || 'HS256',
				kid: options.externalAccount.id,
				url: me._directoryUrls.newAccount
			},
			payload: Enc.strToBuf(JSON.stringify(pubkey))
		}).then(function(jws) {
			accountRequest.externalAccountBinding = jws;
			return accountRequest;
		});
	}

	return Promise.resolve()
		.then(function() {
			//#console.debug('[ACME.js] agreeToTerms');
			var agreeToTerms = options.agreeToTerms;
			if (!agreeToTerms) {
				agreeToTerms = function(terms) {
					if (agreers[options.subscriberEmail]) {
						return true;
					}
					agreers[options.subscriberEmail] = true;
					console.info();
					console.info(
						'By using this software you (' +
							options.subscriberEmail +
							') are agreeing to the following:'
					);
					console.info(
						'ACME Subscriber Agreement:',
						terms.acmeSubscriberTermsUrl
					);
					console.info(
						'Greenlock/ACME.js Terms of Use:',
						terms.acmeJsTermsUrl
					);
					console.info();
					return true;
				};
			} else if (true === agreeToTerms) {
				agreeToTerms = function(terms) {
					return terms && true;
				};
			}
			return agreeToTerms({
				acmeSubscriberTermsUrl: me._tos,
				acmeJsTermsUrl: 'https://rootprojects.org/legal/#terms'
			});
		})
		.then(agree)
		.then(getAccount);
};
