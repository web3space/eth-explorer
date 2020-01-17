# @root/encoding

Lightweight, Zero-dependency, translation between Unicode Strings, Binary Strings, Buffers, Base64, Hex, UCS-2, UTF-8, etc.

| < 1k gzipped | 2.6k minified | 3.6k full |

Works identically on all platforms:

-   [x] Web Browsers
    -   Chrome
    -   Firefox
    -   Microsoft Edge
    -   Internet Explorer
-   [x] Node.js
-   [x] WebPack

# Usage

**Vanilla JS**

```html
<script src="https://unpkg.com/@root/encoding@1.0.0/dist/encoding.all.js"></script>
```

```html
<script src="https://unpkg.com/@root/encoding@1.0.0/dist/encoding.all.min.js"></script>
```

```js
var Enc = window.Encoding;

Enc.strToBuf('Hello, 世界!');
```

**WebPack**, Node

```js
var Enc = require('@root/encoding');

Enc.strToBuf('Hello, 世界!');
```

# Use cases

Typically you want to use this in a browser when you need to convert user input to some sort
of Byte Array for hashing or encoding in an ancient format.

For example:

-   [x] Hashing passwords
-   [x] Secure Remote Password
-   [x] JWT and JWS signing and verifying
-   [x] ASN1 parsing and packing
    -   [x] DER
    -   [x] x509
    -   [x] CSR
    -   [x] PEM

The purpose of this library is to make it easy to support common string and buffer encoding and decoding
in both Browsers and node with minimal code.

# Examples

Strings and Byte Arrays

```js
var Enc = require('@root/encoding/bytes');

Enc.binToStr(bin);
Enc.binToBuf(bin);

Enc.bufToBin(buf);
Enc.bufToStr(buf);

Enc.strToBin(str);
Enc.strToBuf(str);
```

Hex

```js
var Enc = require('@root/encoding/hex');

Enc.hexToBuf(hex);
Enc.hexToStr(hex);

Enc.bufToHex(buf);
Enc.strToHex(str);
```

Base64

```js
var Enc = require('@root/encoding/base64');

Enc.base64ToBuf(b64);
Enc.base64ToStr(b64);

Enc.bufToBase64(buf);
Enc.strToBase64(str);
```

URL Safe Base64

(all of `base64To*()` accept URL Safe Base64)

```js
var Enc = require('@root/encoding/base64');

Enc.base64ToUrlBase64(b64);
Enc.urlBase64ToBase64(u64);

Enc.bufToUrlBase64(buf);
Enc.strToUrlBase64(str);
```

Base64 and Hex

```
require('@root/encoding/base64');
require('@root/encoding/hex');

var Enc = require('@root/encoding');

Enc.hexToBase64(hex);
Enc.base64ToHex(b64);
```

# Browser API

(the Node API signatures are the same, but implemented with `Buffer`)

Conversions between these formats are supported:

-   Strings and Buffers
-   Hex
-   Base64

## Strings and Buffers

JavaScript has two types of strings:

-   _Binary Strings_, which we call `bin`
-   _Unicode Strings_, which we call `str` (USC-2, essentially UTF-16)
    -   treated as UTF-8 for the purposes of `encodeURIComponent`

JavaScript has two (and a half) ways to support Byte Arrays:

-   `Array`, which we call `arr`
-   `Uint8Array`, which we call `buf` (of the `ArrayBuffer` family)
-   `Buffer` (node-only, but implemented as `Uint8Array`)

The API for the conversions is centered around `Uint8Array` (`Buffer`) but,
for browser compatibility, sometimes requires the use of _Binary Strings_.

**API**

We provide conversions directly to each of the following:

| Name  | Type           | Description                                   |
| :---- | :------------- | :-------------------------------------------- |
| `str` | Unicode String | Handled by `split('')` as two-byte characters |
| `bin` | Binary String  | Handled by `split('')` as single-byte chars   |
| `buf` | Byte Array     | Truncated to single-byte chars                |

The names and signatures of the functions are as follows:

To Buffer

-   Binary String to Buffer
    -   binToBuf(bin)
-   Unicode String (UTF-8) to Buffer
    -   strToBuf(str)

To Unicode String

-   Binary String to Unicode String (UTF-8)
    -   binToStr(bin)
-   Buffer to Unicode String (UTF-8)
    -   bufToStr(buf)

To Binary String

-   Buffer to Binary String
    -   bufToBin(buf)
-   Unicode String to Binary String
    -   strToBin(str)

It's very easy to convert from Binary Strings to Byte Arrays (`Uint8Array.from(bin.split(''))`)
and from `Uint8Array` to Binary String (`Array.from(buf).join('')`).

The real value is converting between Unicode Strings to (UTF-8) Binary Strings, and back:

```js
function toBin(str) {
	var escstr = encodeURIComponent(str);
	return escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
		return String.fromCharCode(parseInt(p1, 16));
	});
}
```

```js
function toStr(bin) {
	var escstr = bin.replace(/(.)/g, function(m, p) {
		var code = p
			.charCodeAt(0)
			.toString(16)
			.toUpperCase();
		if (code.length < 2) {
			code = '0' + code;
		}
		return '%' + code;
	});

	return decodeURIComponent(escstr);
}
```

## Hex

JavaScript does not have a native way to create hex, aside from small numbers:

```js
(12345).toString(16);
```

The hex functions convert to and from hexidecimal:

| Name  | Type       | Description                                    |
| :---- | :--------- | :--------------------------------------------- |
| `hex` | Hex String | Handled by `split('')` as half-byte characters |

To Hex

-   Binary String to Hex
    -   Enc.bufToHex(Enc.binToBuf(bin))
-   Byte Array to Hex
    -   bufToHex
-   Unicode String (UTF-8) to Hex
    -   strToHex

From Hex

-   Hex to Binary String
    -   Enc.hexToBuf(Enc.bufToBin(hex))
-   Hex to Byte Array
    -   hexToBuf
-   Hex to Unicode String (UTF-8)
    -   hexToStr

However, assuming you have a single-byte string, it's very easy to convert back and forth:

```js
function toHex(any) {
	var hex = [];
	var i, h;
	var len = any.byteLength || any.length;

	for (i = 0; i < len; i += 1) {
		h = any[i].toString(16);
		if (h.length % 2) {
			h = '0' + h;
		}
		hex.push(h);
	}

	return hex.join('').toLowerCase();
}
```

```js
function fromHex(hex) {
	var arr = hex.match(/.{2}/g).map(function(h) {
		return parseInt(h, 16);
	});
	return Uint8Array.from(arr);
}
```

## Base64

Browser JavaScript _does_ have a native way convert between Binary Strings and Base64:

```js
var b64 = btoa('An ASCII string is a Binary String');
// Note: A Unicode String is NOT
```

```js
var bin = atob('SGVsbG8sIOS4lueVjCE=');
```

However, it does **not** have a native way to convert between Unicode Strings and Binary Strings,
nor to and from URL Safe Base64.

The base64 module provides simpler conversions to and from Base 64 and URL Safe Base64:

| Name  | Type            | Description                                               |
| :---- | :-------------- | :-------------------------------------------------------- |
| `b64` | Base64          | Standard Base64 as handled by `btoa` and `atob`           |
| `u64` | URL Safe Base64 | Replaces `+` with `-` and `/` with `_`, and omits padding |

To Base64

-   Unicode String (UTF-8) to Base64
    -   strToBase64(str)
-   Binary String to Base64
    -   Enc.bufToBase64(Enc.binToBuf(bin))
-   Byte Array to Base64
    -   bufToBase64(buf)

From Base64 (and URL Safe Base64)

-   Base64 to Unicode String (UTF-8)
    -   base64ToStr(b64)
-   Base64 to Binary String
    -   Enc.bufToBin(Enc.base64ToBuf(b64)))
-   Base64 to Byte Array
    -   base64ToBuf(b64)

To URL Safe Base64

-   Base64 to URL Safe Base64
    -   base64ToUrlBase64(b64);
-   URL Safe Base64 to Base64
    -   urlBase64ToBase64(u64);
-   Binary String to URL Safe Base64
    -   Enc.bufToUrlBase64(Enc.binToBuf(bin));
-   Byte Array to URL Safe Base64
    -   bufToUrlBase64(buf);
-   Unicode String (UTF-8) to URL Safe Base64
    -   strToUrlBase64(str);

# FAQ

## Why yet another encoding library?

We write code that works both in node and in browsers,
and we like to keep it small, light, and focused.

By using browser native functions rather than 're-inventing the wheel'

## Why not 'browserified' Buffer?

The most common 'browserified' `Buffer` implementations are quite large -
either because they don't use browser-native code or they guarantee perfect
compatibility with node's `Buffer`, which isn't necessary for most people.

On the other hand, Browsers have already been able to translate between
Base64, UTF-8, Binary Strings, and Byte Arrays (Buffers) all the way back
since _before_ IE6!

Using these browser-native methods eliminates hundreds of lines of code:

-   `btoa` Binary String to Base64 (ASCII)
-   `atob` Base64 (ASCII) to Binary String
-   `encodeURIComponent` Unicode String to Hex-Escaped String
-   `decodeURIComponent` Hex-Escaped String to Unicode String
-   `String.prototype.charCodeAt` ASCII to Byte
-   `String.fromCharCode` Byte to ASCII

The code is typically also much easier to read. In many cases the conversion is only one line long.

Since a node `Buffer` is actually an `ArrayBuffer`, node's `Buffer` really only has the advantage
of convenient conversions, so that's really all that needs to be implemented.

In the case of ancient browsers which do not support `Uint8Array`, the native `Array` is still
the best substitute.

## Why use this in node?

Unless you're writing code that's intended to work in the browser, you probably shouldn't -
Node's `Buffer` does the job quite well.

The one function you may still be interested in, which Node's `Buffer` omits, is this one:

```js
function toUrlSafeBase64(base64) {
	return base64
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}
```

HOWEVER, if you believe that browser users would benefit from your library, this is a much
better alternative for simple use cases where you're dealing with small bits of code.
