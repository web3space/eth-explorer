'use strict';

var http = require('http');
var https = require('https');
var url = require('url');

function debug() {
    if (module.exports.debug) {
        console.log.apply(console, arguments);
    }
}

function mergeOrDelete(defaults, updates) {
    Object.keys(defaults).forEach(function(key) {
        if (!(key in updates)) {
            updates[key] = defaults[key];
            return;
        }

        // neither accept the prior default nor define an explicit value
        // CRDT probs...
        if ('undefined' === typeof updates[key]) {
            delete updates[key];
        } else if (
            'object' === typeof defaults[key] &&
            'object' === typeof updates[key]
        ) {
            updates[key] = mergeOrDelete(defaults[key], updates[key]);
        }
    });

    return updates;
}

// retrieves an existing header, case-sensitive
function getHeaderName(reqOpts, header) {
    var headerNames = {};
    Object.keys(reqOpts.headers).forEach(function(casedName) {
        headerNames[casedName.toLowerCase()] = casedName;
    });
    // returns the key, which in erroneous cases could be an empty string
    return headerNames[header.toLowerCase()];
}
// returns whether or not a header exists, case-insensitive
function hasHeader(reqOpts, header) {
    return 'undefined' !== typeof getHeaderName(reqOpts, header);
}

function toJSONifier(keys) {
    return function() {
        var obj = {};
        var me = this;

        keys.forEach(function(key) {
            if (me[key] && 'function' === typeof me[key].toJSON) {
                obj[key] = me[key].toJSON();
            } else {
                obj[key] = me[key];
            }
        });

        return obj;
    };
}

function setDefaults(defs) {
    defs = defs || {};

    function urequestHelper(opts, cb) {
        debug('\n[urequest] processed options:');
        debug(opts);

        var req;
        var finalOpts = {};

        function onResponse(resp) {
            var followRedirect;

            Object.keys(defs).forEach(function(key) {
                if (key in opts && 'undefined' !== typeof opts[key]) {
                    return;
                }
                opts[key] = defs[key];
            });
            followRedirect = opts.followRedirect;

            resp.toJSON = toJSONifier([
                'statusCode',
                'body',
                'headers',
                'request'
            ]);

            resp.request = req;
            resp.request.uri = url.parse(opts.url);
            //resp.request.method = opts.method;
            resp.request.headers = finalOpts.headers;
            resp.request.toJSON = toJSONifier(['uri', 'method', 'headers']);
            if (opts.debug) {
                console.debug('[@root/request] Response Headers:');
                console.debug(resp.toJSON());
            }

            if (
                followRedirect &&
                resp.headers.location &&
                -1 !== [301, 302, 307, 308].indexOf(resp.statusCode)
            ) {
                debug('Following redirect: ' + resp.headers.location);
                if ('GET' !== opts.method && !opts.followAllRedirects) {
                    followRedirect = false;
                }
                if (opts._redirectCount >= opts.maxRedirects) {
                    followRedirect = false;
                }
                if ('function' === opts.followRedirect) {
                    if (!opts.followRedirect(resp)) {
                        followRedirect = false;
                    }
                }
                if (followRedirect) {
                    if (!opts.followOriginalHttpMethod) {
                        opts.method = 'GET';
                        opts.body = null;
                        delete opts.headers[
                            getHeaderName(opts, 'Content-Length')
                        ];
                        delete opts.headers[
                            getHeaderName(opts, 'Transfer-Encoding')
                        ];
                    }
                    if (opts.removeRefererHeader && opts.headers) {
                        delete opts.headers.referer;
                    }
                    // TODO needs baseUrl, maybe test for host / socketPath?
                    opts.url = resp.headers.location;
                    opts.uri = url.parse(opts.url);
                    return urequestHelper(opts, cb);
                }
            }
            if (null === opts.encoding) {
                resp._body = [];
            } else {
                resp.body = '';
            }
            resp._bodyLength = 0;
            resp.on('data', function(chunk) {
                if ('string' === typeof resp.body) {
                    resp.body += chunk.toString(opts.encoding);
                } else {
                    resp._body.push(chunk);
                    resp._bodyLength += chunk.length;
                }
            });
            resp.on('end', function() {
                if ('string' !== typeof resp.body) {
                    if (1 === resp._body.length) {
                        resp.body = resp._body[0];
                    } else {
                        resp.body = Buffer.concat(resp._body, resp._bodyLength);
                    }
                    resp._body = null;
                }
                if (opts.json && 'string' === typeof resp.body) {
                    // TODO I would parse based on Content-Type
                    // but request.js doesn't do that.
                    try {
                        resp.body = JSON.parse(resp.body);
                    } catch (e) {
                        // ignore
                    }
                }

                debug('\n[urequest] resp.toJSON():');
                debug(resp.toJSON());
                if (opts.debug) {
                    console.debug('[@root/request] Response Body:');
                    console.debug(resp.body);
                }
                cb(null, resp, resp.body);
            });
        }

        var _body;
        var MyFormData;
        var form;
        var formHeaders;
        var requester;

        if (opts.body) {
            if (true === opts.json) {
                _body = JSON.stringify(opts.body);
            } else {
                _body = opts.body;
            }
        } else if (opts.json && true !== opts.json) {
            _body = JSON.stringify(opts.json);
        } else if (opts.form) {
            _body = Object.keys(opts.form)
                .filter(function(key) {
                    if ('undefined' !== typeof opts.form[key]) {
                        return true;
                    }
                })
                .map(function(key) {
                    return (
                        encodeURIComponent(key) +
                        '=' +
                        encodeURIComponent(String(opts.form[key]))
                    );
                })
                .join('&');
            opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        if ('string' === typeof _body) {
            _body = Buffer.from(_body);
        }

        Object.keys(opts.uri).forEach(function(key) {
            finalOpts[key] = opts.uri[key];
        });

        // A bug should be raised if request does it differently,
        // but I think we're supposed to pass all acceptable options
        // on to the raw http request
        [
            'family',
            'host',
            'localAddress',
            'agent',
            'createConnection',
            'timeout',
            'setHost'
        ].forEach(function(key) {
            finalOpts[key] = opts.uri[key];
        });

        finalOpts.method = opts.method;
        finalOpts.headers = JSON.parse(JSON.stringify(opts.headers));
        if (_body) {
            // Most APIs expect (or require) Content-Length except in the case of multipart uploads
            // Transfer-Encoding: Chunked (the default) is generally only well-supported downstream
            finalOpts.headers['Content-Length'] =
                _body.byteLength || _body.length;
        }
        if (opts.auth) {
            // if opts.uri specifies auth it will be parsed by url.parse and passed directly to the http module
            if ('string' !== typeof opts.auth) {
                opts.auth =
                    (opts.auth.user || opts.auth.username || '') +
                    ':' +
                    (opts.auth.pass || opts.auth.password || '');
            }
            if ('string' === typeof opts.auth) {
                finalOpts.auth = opts.auth;
            }
            if (false === opts.sendImmediately) {
                console.warn(
                    '[Warn] setting `sendImmediately: false` is not yet supported. Please open an issue if this is an important feature that you need.'
                );
            }
            if (opts.bearer) {
                // having a shortcut for base64 encoding makes sense, but this? Eh, whatevs...
                finalOpts.header.Authorization = 'Bearer: ' + opts.bearer;
            }
        }
        if (opts.formData) {
            try {
                MyFormData = opts.FormData || require('form-data');
                // potential options https://github.com/felixge/node-combined-stream/blob/master/lib/combined_stream.js#L7-L15
            } catch (e) {
                console.error(
                    'urequest does not include extra dependencies by default'
                );
                console.error(
                    "if you need to use 'form-data' you may install it, like so:"
                );
                console.error('  npm install --save form-data');
                cb(e);
                return;
            }
            try {
                form = new MyFormData();
                Object.keys(opts.formData).forEach(function(key) {
                    function add(key, data, opts) {
                        if (data.value) {
                            opts = data.options;
                            data = data.value;
                        }
                        form.append(key, data, opts);
                    }
                    if (Array.isArray(opts.formData[key])) {
                        opts.formData[key].forEach(function(data) {
                            add(key, data);
                        });
                    } else {
                        add(key, opts.formData[key]);
                    }
                });
            } catch (e) {
                cb(e);
                return;
            }
            formHeaders = form.getHeaders();
            Object.keys(formHeaders).forEach(function(header) {
                finalOpts.headers[header] = formHeaders[header];
            });
        }

        // TODO support unix sockets
        if ('https:' === finalOpts.protocol) {
            // https://nodejs.org/api/https.html#https_https_request_options_callback
            debug('\n[urequest] https.request(opts):');
            debug(finalOpts);
            requester = https;
        } else if ('http:' === finalOpts.protocol) {
            // https://nodejs.org/api/http.html#http_http_request_options_callback
            debug('\n[urequest] http.request(opts):');
            debug(finalOpts);
            requester = http;
        } else {
            cb(new Error("unknown protocol: '" + opts.uri.protocol + "'"));
            return;
        }

        if (form) {
            debug("\n[urequest] '" + finalOpts.method + "' (request) form");
            debug(formHeaders);
            // generally uploads don't use Chunked Encoding (some systems have issues with it)
            // and I don't want to do the work to calculate the content-lengths. This seems to work.
            req = form.submit(finalOpts, function(err, resp) {
                if (err) {
                    cb(err);
                    return;
                }
                onResponse(resp);
                resp.resume();
            });
            //req = requester.request(finalOpts, onResponse);
            //req.on('error', cb);
            //form.pipe(req);
            return;
        }

        if (opts.debug) {
            console.debug('');
            console.debug('[@root/request] Request Options:');
            console.debug(finalOpts);
            if (_body) {
                console.debug('[@root/request] Request Body:');
                console.debug(
                    opts.body || opts.form || opts.formData || opts.json
                );
            }
        }
        req = requester.request(finalOpts, onResponse);
        req.on('error', cb);

        if (_body) {
            debug("\n[urequest] '" + finalOpts.method + "' (request) body");
            debug(_body);
            // used for chunked encoding
            //req.write(_body);
            // used for known content-length
            req.end(_body);
        } else {
            req.end();
        }
    }

    function parseUrl(str) {
        var obj = url.parse(str);
        var paths;
        if ('unix' !== (obj.hostname || obj.host || '').toLowerCase()) {
            return obj;
        }

        obj.href = null;
        obj.hostname = obj.host = null;

        paths = (obj.pathname || obj.path || '').split(':');

        obj.socketPath = paths.shift();
        obj.pathname = obj.path = paths.join(':');

        return obj;
    }

    function urequest(opts, cb) {
        debug('\n[urequest] received options:');
        debug(opts);
        var reqOpts = {};
        // request.js behavior:
        // encoding: null + json ? unknown
        // json => attempt to parse, fail silently
        // encoding => buffer.toString(encoding)
        // null === encoding => Buffer.concat(buffers)
        if ('string' === typeof opts) {
            opts = { url: opts };
        }

        module.exports._keys.forEach(function(key) {
            if (key in opts && 'undefined' !== typeof opts[key]) {
                reqOpts[key] = opts[key];
            } else if (key in defs) {
                reqOpts[key] = defs[key];
            }
        });

        // TODO url.resolve(defs.baseUrl, opts.url);
        if ('string' === typeof opts.url || 'string' === typeof opts.uri) {
            if ('string' === typeof opts.url) {
                reqOpts.url = opts.url;
                reqOpts.uri = parseUrl(opts.url);
            } else if ('string' === typeof opts.uri) {
                reqOpts.url = opts.uri;
                reqOpts.uri = parseUrl(opts.uri);
            }
        } else {
            if ('object' === typeof opts.uri) {
                reqOpts.url = url.format(opts.uri);
                reqOpts.uri = opts.uri;
                //reqOpts.uri = url.parse(reqOpts.uri);
            } else if ('object' === typeof opts.url) {
                reqOpts.url = url.format(opts.url);
                reqOpts.uri = opts.url;
                //reqOpts.uri = url.parse(reqOpts.url);
            }
        }

        if (
            opts.body ||
            (opts.json && true !== opts.json) ||
            opts.form ||
            opts.formData
        ) {
            // TODO this is probably a deviation from request's API
            // need to check and probably eliminate it
            reqOpts.method = (reqOpts.method || 'POST').toUpperCase();
        } else {
            reqOpts.method = (reqOpts.method || 'GET').toUpperCase();
        }
        if (!reqOpts.headers) {
            reqOpts.headers = {};
        }

        // crazy case for easier testing
        if (!hasHeader(reqOpts, 'CoNTeNT-TyPe')) {
            if (
                (true === reqOpts.json && reqOpts.body) ||
                (true !== reqOpts.json && reqOpts.json)
            ) {
                reqOpts.headers['Content-Type'] = 'application/json';
            }
        }

        if (opts.debug) {
            reqOpts.debug = opts.debug;
        }
        return urequestHelper(reqOpts, cb);
    }

    function smartPromisify(fn) {
        return function(opts) {
            var cb;
            if ('function' === typeof arguments[1]) {
                cb = Array.prototype.slice.call(arguments)[1];
                return fn(opts, cb);
            }
            return new Promise(function(resolve, reject) {
                fn(opts, function(err, resp) {
                    if (err) {
                        err._response = resp;
                        reject(err);
                        return;
                    }
                    resolve(resp);
                });
            });
        };
    }

    var smartUrequest = smartPromisify(urequest);

    smartUrequest.defaults = function(_defs) {
        _defs = mergeOrDelete(defs, _defs);
        return setDefaults(_defs);
    };
    ['get', 'put', 'post', 'patch', 'delete', 'head', 'options'].forEach(
        function(method) {
            smartUrequest[method] = smartPromisify(function(obj, cb) {
                if ('string' === typeof obj) {
                    obj = { url: obj };
                }
                obj.method = method.toUpperCase();
                urequest(obj, cb);
            });
        }
    );
    smartUrequest.del = urequest.delete;

    return smartUrequest;
}

var _defaults = {
    sendImmediately: true,
    method: '',
    headers: {},
    useQuerystring: false,
    followRedirect: true,
    followAllRedirects: false,
    followOriginalHttpMethod: false,
    maxRedirects: 10,
    removeRefererHeader: false,
    //, encoding: undefined
    gzip: false
    //, body: undefined
    //, json: undefined
};
module.exports = setDefaults(_defaults);

module.exports._keys = Object.keys(_defaults).concat([
    'encoding',
    'body',
    'json',
    'form',
    'auth',
    'formData',
    'FormData'
]);
module.exports.debug =
    -1 !== (process.env.NODE_DEBUG || '').split(/\s+/g).indexOf('urequest');

debug('DEBUG ON for urequest');
