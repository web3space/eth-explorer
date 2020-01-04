# [µRequest](https://git.rootprojects.org/root/request.js) | a [Root](https://rootprojects.org) project

> Minimalist HTTP client

A lightweight alternative to (and drop-in replacement for) request.

Written from scratch, with zero-dependencies.

## Super simple to use

µRequest is designed to be a drop-in replacement for request. It supports HTTPS and follows redirects by default.

```bash
npm install --save @root/request
```

```js
var request = require('@root/request');
request('http://www.google.com', function(error, response, body) {
    console.log('error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
});
```

**Using Promises**

```js
var promisify = require('util').promisify;
var request = require('@root/request');
request = promisify(request);

request('http://www.google.com')
    .then(function(response) {
        console.log('statusCode:', response.statusCode); // Print the response status code if a response was received
        console.log('body:', response.body); // Print the HTML for the Google homepage.
    })
    .catch(function(error) {
        console.log('error:', error); // Print the error if one occurred
    });
```

## Table of contents

-   [Forms](#forms)
-   [HTTP Authentication](#http-authentication)
-   [Custom HTTP Headers](#custom-http-headers)
-   [Unix Domain Sockets](#unix-domain-sockets)
-   [**All Available Options**](#requestoptions-callback)

## Forms

`urequest` supports `application/x-www-form-urlencoded` and `multipart/form-data` form uploads.

<!-- For `multipart/related` refer to the `multipart` API. -->

#### application/x-www-form-urlencoded (URL-Encoded Forms)

URL-encoded forms are simple.

```js
request.post('http://service.com/upload', { form: { key: 'value' } });
// or
request.post(
    { url: 'http://service.com/upload', form: { key: 'value' } },
    function(err, httpResponse, body) {
        /* ... */
    }
);
```

<!--
// or
request.post('http://service.com/upload').form({key:'value'})
-->

#### multipart/form-data (Multipart Form Uploads)

For `multipart/form-data` we use the [form-data](https://github.com/form-data/form-data) library by [@felixge](https://github.com/felixge). For the most cases, you can pass your upload form data via the `formData` option.

To use `form-data`, you must install it separately:

```bash
npm install --save form-data@2
```

```js
var formData = {
    // Pass a simple key-value pair
    my_field: 'my_value',
    // Pass data via Buffers
    my_buffer: Buffer.from([1, 2, 3]),
    // Pass data via Streams
    my_file: fs.createReadStream(__dirname + '/unicycle.jpg'),
    // Pass multiple values /w an Array
    attachments: [
        fs.createReadStream(__dirname + '/attachment1.jpg'),
        fs.createReadStream(__dirname + '/attachment2.jpg')
    ],
    // Pass optional meta-data with an 'options' object with style: {value: DATA, options: OPTIONS}
    // Use case: for some types of streams, you'll need to provide "file"-related information manually.
    // See the `form-data` README for more information about options: https://github.com/form-data/form-data
    custom_file: {
        value: fs.createReadStream('/dev/urandom'),
        options: {
            filename: 'topsecret.jpg',
            contentType: 'image/jpeg'
        }
    }
};
request.post(
    { url: 'http://service.com/upload', formData: formData },
    function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('upload failed:', err);
        }
        console.log('Upload successful!  Server responded with:', body);
    }
);
```

<!--

For advanced cases, you can access the form-data object itself via `r.form()`. This can be modified until the request is fired on the next cycle of the event-loop. (Note that this calling `form()` will clear the currently set form data for that request.)

```js
// NOTE: Advanced use-case, for normal use see 'formData' usage above
var r = request.post('http://service.com/upload', function optionalCallback(err, httpResponse, body) {...})
var form = r.form();
form.append('my_field', 'my_value');
form.append('my_buffer', Buffer.from([1, 2, 3]));
form.append('custom_file', fs.createReadStream(__dirname + '/unicycle.jpg'), {filename: 'unicycle.jpg'});
```
-->

See the [form-data README](https://github.com/form-data/form-data) for more information & examples.

---

## HTTP Authentication

<!--
request.get('http://some.server.com/').auth('username', 'password', false);
// or
request.get('http://some.server.com/').auth(null, null, true, 'bearerToken');
// or
-->

```js
request.get('http://some.server.com/', {
    auth: {
        user: 'username',
        pass: 'password',
        sendImmediately: false
    }
});
// or
request.get('http://some.server.com/', {
    auth: {
        bearer: 'bearerToken'
    }
});
```

If passed as an option, `auth` should be a hash containing values:

-   `user` || `username`
-   `pass` || `password`
-   `bearer` (optional)

<!--
- `sendImmediately` (optional)

The method form takes parameters
`auth(username, password, sendImmediately, bearer)`.

`sendImmediately` defaults to `true`, which causes a basic or bearer
authentication header to be sent. If `sendImmediately` is `false`, then
`request` will retry with a proper authentication header after receiving a
`401` response from the server (which must contain a `WWW-Authenticate` header
indicating the required authentication method).
-->

Note that you can also specify basic authentication using the URL itself, as
detailed in [RFC 1738](http://www.ietf.org/rfc/rfc1738.txt). Simply pass the
`user:password` before the host with an `@` sign:

```js
var username = 'username',
    password = 'password',
    url = 'http://' + username + ':' + password + '@some.server.com';

request({ url: url }, function(error, response, body) {
    // Do more stuff with 'body' here
});
```

<!--
Digest authentication is supported, but it only works with `sendImmediately`
set to `false`; otherwise `request` will send basic authentication on the
initial request, which will probably cause the request to fail.
-->

Bearer authentication is supported, and is activated when the `bearer` value is
available. The value may be either a `String` or a `Function` returning a
`String`. Using a function to supply the bearer token is particularly useful if
used in conjunction with `defaults` to allow a single function to supply the
last known token at the time of sending a request, or to compute one on the fly.

[back to top](#table-of-contents)

---

## Custom HTTP Headers

HTTP Headers, such as `User-Agent`, can be set in the `options` object.
In the example below, we call the github API to find out the number
of stars and forks for the request repository. This requires a
custom `User-Agent` header as well as https.

```js
var request = require('request');

var options = {
    url: 'https://api.github.com/repos/request/request',
    headers: {
        'User-Agent': 'request'
    }
};

function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
        console.log(info.stargazers_count + ' Stars');
        console.log(info.forks_count + ' Forks');
    }
}

request(options, callback);
```

[back to top](#table-of-contents)

---

## UNIX Domain Sockets

`urequest` supports making requests to [UNIX Domain Sockets](https://en.wikipedia.org/wiki/Unix_domain_socket). To make one, use the following URL scheme:

```js
/* Pattern */ 'http://unix:SOCKET:PATH';
/* Example */ request.get(
    'http://unix:/absolute/path/to/unix.socket:/request/path'
);
```

Note: The `SOCKET` path is assumed to be absolute to the root of the host file system.

[back to top](#table-of-contents)

---

## request(options, callback)

The first argument can be either a `url` or an `options` object. The only required option is `uri`; all others are optional.

-   `uri` || `url` - fully qualified uri or a parsed url object from `url.parse()`
-   `method` - http method (default: `"GET"`)
-   `headers` - http headers (default: `{}`)

<!-- TODO
- `baseUrl` - fully qualified uri string used as the base url. Most useful with `request.defaults`, for example when you want to do many requests to the same domain. If `baseUrl` is `https://example.com/api/`, then requesting `/end/point?test=true` will fetch `https://example.com/api/end/point?test=true`. When `baseUrl` is given, `uri` must also be a string.
-->

---

-   `body` - entity body for PATCH, POST and PUT requests. Must be a `Buffer`, `String` or `ReadStream`. If `json` is `true`, then `body` must be a JSON-serializable object.
-   `json` - sets `body` to JSON representation of value and adds `Content-type: application/json` header. Additionally, parses the response body as JSON.

<!-- TODO
- `form` - when passed an object or a querystring, this sets `body` to a querystring representation of value, and adds `Content-type: application/x-www-form-urlencoded` header. When passed no options, a `FormData` instance is returned (and is piped to request). See "Forms" section above.
- `formData` - data to pass for a `multipart/form-data` request. See
  [Forms](#forms) section above.
- `multipart` - array of objects which contain their own headers and `body`
  attributes. Sends a `multipart/related` request. See [Forms](#forms) section
  above.
  - Alternatively you can pass in an object `{chunked: false, data: []}` where
    `chunked` is used to specify whether the request is sent in
    [chunked transfer encoding](https://en.wikipedia.org/wiki/Chunked_transfer_encoding)
    In non-chunked requests, data items with body streams are not allowed.
- `preambleCRLF` - append a newline/CRLF before the boundary of your `multipart/form-data` request.
- `postambleCRLF` - append a newline/CRLF at the end of the boundary of your `multipart/form-data` request.
- `jsonReviver` - a [reviver function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) that will be passed to `JSON.parse()` when parsing a JSON response body.
- `jsonReplacer` - a [replacer function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) that will be passed to `JSON.stringify()` when stringifying a JSON request body.
-->

---

-   `followRedirect` - follow HTTP 3xx responses as redirects (default: `true`). This property can also be implemented as function which gets `response` object as a single argument and should return `true` if redirects should continue or `false` otherwise.
-   `followAllRedirects` - follow non-GET HTTP 3xx responses as redirects (default: `false`)
-   `followOriginalHttpMethod` - by default we redirect to HTTP method GET. you can enable this property to redirect to the original HTTP method (default: `false`)
-   `maxRedirects` - the maximum number of redirects to follow (default: `10`)
-   `removeRefererHeader` - removes the referer header when a redirect happens (default: `false`). **Note:** if true, referer header set in the initial request is preserved during redirect chain.

---

-   `encoding` - encoding to be used on `setEncoding` of response data. If `null`, the `body` is returned as a `Buffer`. Anything else **(including the default value of `undefined`)** will be passed as the [encoding](http://nodejs.org/api/buffer.html#buffer_buffer) parameter to `toString()` (meaning this is effectively `utf8` by default). (**Note:** if you expect binary data, you should set `encoding: null`.)

<!-- TODO
- `gzip` - if `true`, add an `Accept-Encoding` header to request compressed content encodings from the server (if not already present) and decode supported content encodings in the response. **Note:** Automatic decoding of the response content is performed on the body data returned through `request` (both through the `request` stream and passed to the callback function) but is not performed on the `response` stream (available from the `response` event) which is the unmodified `http.IncomingMessage` object which may contain compressed data. See example below.
- `jar` - if `true`, remember cookies for future use (or define your custom cookie jar; see examples section)
-->

---

## Convenience methods

There are also shorthand methods for different HTTP METHODs and some other conveniences.

### request.defaults(options)

This method **returns a wrapper** around the normal request API that defaults
to whatever options you pass to it.

**Note:** `request.defaults()` **does not** modify the global request API;
instead, it **returns a wrapper** that has your default settings applied to it.

**Note:** You can call `.defaults()` on the wrapper that is returned from
`request.defaults` to add/override defaults that were previously defaulted.

For example:

```js
//requests using baseRequest() will set the 'x-token' header
var baseRequest = request.defaults({
    headers: { 'x-token': 'my-token' }
});

//requests using specialRequest() will include the 'x-token' header set in
//baseRequest and will also include the 'special' header
var specialRequest = baseRequest.defaults({
    headers: { special: 'special value' }
});
```

### request.METHOD()

These HTTP method convenience functions act just like `request()` but with a default method already set for you:

-   _request.get()_: Defaults to `method: "GET"`.
-   _request.post()_: Defaults to `method: "POST"`.
-   _request.put()_: Defaults to `method: "PUT"`.
-   _request.patch()_: Defaults to `method: "PATCH"`.
-   _request.del() / request.delete()_: Defaults to `method: "DELETE"`.
-   _request.head()_: Defaults to `method: "HEAD"`.
-   _request.options()_: Defaults to `method: "OPTIONS"`.

---

## Debugging

There are at least <!--three--> two ways to debug the operation of `request`:

1. Launch the node process like `NODE_DEBUG=urequest node script.js`
   (`lib,request,otherlib` works too).

2. Set `require('@root/request').debug = true` at any time (this does the same thing
   as #1).

<!-- TODO
3. Use the [request-debug module](https://github.com/request/request-debug) to
   view request and response headers and bodies.

[back to top](#table-of-contents)
-->

[back to top](#table-of-contents)
