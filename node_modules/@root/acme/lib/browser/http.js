'use strict';

var http = module.exports;

http.request = function(opts) {
	opts.cors = true;
	return window.fetch(opts.url, opts).then(function(resp) {
		var headers = {};
		var result = {
			statusCode: resp.status,
			headers: headers,
			toJSON: function() {
				return this;
			}
		};
		Array.from(resp.headers.entries()).forEach(function(h) {
			headers[h[0]] = h[1];
		});
		if (!headers['content-type']) {
			return result;
		}
		if (/json/.test(headers['content-type'])) {
			return resp.json().then(function(json) {
				result.body = json;
				return result;
			});
		}
		return resp.text().then(function(txt) {
			result.body = txt;
			return result;
		});
	});
};
