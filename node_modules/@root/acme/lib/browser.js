'use strict';

var native = module.exports;

native._canCheck = function(me) {
	me._canCheck = {};
	return me
		.request({ url: me._baseUrl + '/api/_acme_api_/' })
		.then(function(resp) {
			if (resp.body.success) {
				me._canCheck['http-01'] = true;
				me._canCheck['dns-01'] = true;
			}
		})
		.catch(function() {
			// ignore
		});
};

native._dns01 = function(me, ch) {
	return me
		.request({
			url: me._baseUrl + '/api/dns/' + ch.dnsHost + '?type=TXT'
		})
		.then(function(resp) {
			var err;
			if (!resp.body || !Array.isArray(resp.body.answer)) {
				err = new Error('failed to get DNS response');
				console.error(err);
				throw err;
			}
			if (!resp.body.answer.length) {
				err = new Error('failed to get DNS answer record in response');
				console.error(err);
				throw err;
			}
			return {
				answer: resp.body.answer.map(function(ans) {
					return { data: ans.data, ttl: ans.ttl };
				})
			};
		});
};

native._http01 = function(me, ch) {
	var url = encodeURIComponent(ch.challengeUrl);
	return me
		.request({
			url: me._baseUrl + '/api/http?url=' + url
		})
		.then(function(resp) {
			return resp.body;
		});
};
