'use strict';

var native = module.exports;
var promisify = require('util').promisify;
var resolveTxt = promisify(require('dns').resolveTxt);
var crypto = require('crypto');

native._canCheck = function(me) {
	me._canCheck = {};
	me._canCheck['http-01'] = true;
	me._canCheck['dns-01'] = true;
	return Promise.resolve();
};

native._dns01 = function(me, ch) {
	// TODO use digd.js
	return resolveTxt(ch.dnsHost).then(function(records) {
		return {
			answer: records.map(function(rr) {
				return {
					data: rr
				};
			})
		};
	});
};

native._http01 = function(me, ch) {
	return new me.request({
		url: ch.challengeUrl
	}).then(function(resp) {
		return resp.body;
	});
};

// the hashcash here is for browser parity only
// basically we ask the client to find a needle in a haystack
// (very similar to CloudFlare's api protection)
native._hashcash = function(ch) {
	if (!ch || !ch.nonce) {
		ch = { nonce: 'xxx' };
	}
	return Promise.resolve()
		.then(function() {
			// only get easy answers
			var len = ch.needle.length;
			var start = ch.start || 0;
			var end = ch.end || Math.ceil(len / 2);
			var window = parseInt(end - start, 10) || 0;

			var maxLen = 6;
			var maxTries = Math.pow(2, maxLen * 8);
			if (
				len > maxLen ||
				window < Math.ceil(len / 2) ||
				ch.needle.toLowerCase() !== ch.needle ||
				ch.alg !== 'SHA-256'
			) {
				// bail unless the server is issuing very easy challenges
				throw new Error('possible and easy answers only, please');
			}

			var haystack;
			var i;
			var answer;
			var needle = Buffer.from(ch.needle, 'hex');
			for (i = 0; i < maxTries; i += 1) {
				answer = i.toString(16);
				if (answer.length % 2) {
					answer = '0' + answer;
				}
				haystack = crypto
					.createHash('sha256')
					.update(Buffer.from(ch.nonce + answer, 'hex'))
					.digest()
					.slice(ch.start, ch.end);
				if (-1 !== haystack.indexOf(needle)) {
					return ch.nonce + ':' + answer;
				}
			}
			return ch.nonce + ':xxx';
		})
		.catch(function() {
			//console.log('[debug]', err);
			// ignore any error
			return ch.nonce + ':xxx';
		});
};
