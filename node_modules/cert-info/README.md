# [cert-info.js](https://git.coolaj86.com/coolaj86/cert-info.js)

Read basic info from a cert.pem / x509 certificate.

Used for [Greenlock.js](https://git.coolaj86.com/coolaj86/greenlock-express.js)

# Features

| <175 lines of code | 1.7k gzipped | 4.4k minified | 8.8k with comments |

* [x] Parses x.509 certificate schemas
  * [x] DER/ASN.1
  * [x] PEM (base64-encoded DER)
  * [x] Subject
  * [x] SAN extension (altNames)
  * [x] Issuance Date (notBefore)
  * [x] Expiry Date (notAfter)
* [x] VanillaJS, **Zero Dependencies**
  * [x] Node.js
  * [ ] Browsers (built, publishing soon)

# Install

```bash
# bin
npm install --global cert-info

# node.js library
npm install --save cert-info
```

# Usage

## CLI

For basic info (subject, altnames, issuedAt, expiresAt):

```bash
cert-info /path/to/cert.pem
```

## node.js

```javascript
'use strict';

var certinfo = require('cert-info');
var cert = fs.readFile('cert.pem', 'ascii', function (err, certstr) {

  // basic info
  console.info(certinfo.info(certstr));

  // if you need to submit a bug report
  console.info(certinfo.debug(certstr));
});
```

Example output:

```javascript
{
  "subject": "localhost.example.com",
  "altnames": [
    "localhost.example.com"
  ],
  "issuedAt": 1465516800000,
  "expiresAt": 1499731199000
}
```

With a few small changes this could also work in the browser
(it has no dependencies and all of the non-browser things are on the Enc object).

# Legal

[cert-info.js](https://git.coolaj86.com/coolaj86/cert-info.js) |
MPL-2.0 |
[Terms of Use](https://therootcompany.com/legal/#terms) |
[Privacy Policy](https://therootcompany.com/legal/#privacy)
