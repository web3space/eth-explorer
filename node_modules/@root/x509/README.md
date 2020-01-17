# @root/x509

Built by [The Root Company](https://therootcompany.com)
for [Greenlock](https://greenlock.domains),
[ACME.js](https://git.rootprojects.org/root/acme.js),
and [Keypairs.js](https://git.rootprojects.org/root/keypairs.js)

Lightweight, Zero-Dependency, x509 encoder and decoder for Node.js and Browsers

| 1.6k gzipped
| 6.8k minified
| 9.7k pretty
|

This provides a set ASN.1 / x509 schemas for DER encoding and decoding
Public / Private Keypairs and CSRs.

-   [x] Zero External Dependencies
-   [x] x509 schemas for common crypto
    -   [x] RSA & ECDSA Public/Private Keypairs
        -   PKCS1
        -   PKCS8
        -   SEC1
        -   SPKI
        -   PKIX
    -   [x] Certificate Signing Requests (CSR)
        -   PKCS10
-   [x] Universal Support
    -   [x] Node.js
    -   [x] Browsers
-   [x] Vanilla JS

Looking for **easy**?

You probably just want to use one of these:

-   [keypairs.js](https://git.rootprojects.org/root/keypairs.js)
-   [csr.js](https://git.rootprojects.org/root/csr.js)

Looking for a **deep dive**? Well, in addition to x509.js,
you'll probably also want one of more of these:

-   [encoding.js](https://git.rootprojects.org/root/encoding.js)
-   [asn1.js](https://git.rootprojects.org/root/asn1.js)
-   [csr.js](https://git.rootprojects.org/root/csr.js)
-   [pem.js](https://git.rootprojects.org/root/pem.js)
-   [keypairs.js](https://git.rootprojects.org/root/keypairs.js)

Want to [contribute](#contributions)?
Need [commercial support](#commercial-support)?

# Install

This package contains both node-specific and browser-specific code,
and the `package.json#browser` field ensures that your package manager
will automatically choose the correct code for your environment.

## Node (and Webpack)

```bash
npm install --save @root/x509
```

```js
var X509 = require('@root/x509');
```

```js
// just the encoders
var X509 = require('@root/x509/packers');
```

```js
// just the decoders
var X509 = require('@root/x509/parsers');
```

## Browsers (Vanilla JS)

```html
<script src="https://unpkg.com/@root/x509/dist/x509.all.js"></script>
```

```html
<script src="https://unpkg.com/@root/x509/dist/x509.all.min.js"></script>
```

```js
var X509 = window.X509;
```

# Usage

This is a _very_ tiny, _very_ efficient x509 package.

Rather than implementing full schemas as defined by the RFCs,
it only implements the parts that are actually used in the wild
by programs like `openssl`, Let's Encrypt, `ssh-keygen`, etc.

Additionally, rather than always using a full parser,
it uses happy-path heuristics to quickly and efficiently
extract the necessary information. It likewise packs very quickly.

## Encoders

The packers encoder JWK as DER.

```js
X509.packPkcs1(jwk);
X509.packSec1(jwk);
X509.packPkcs8(jwk);
X509.packSpki(jwk);
X509.packPkix(jwk); // alias of X509.packSpki
```

There are two special functions specifically for
embeding keys in CSRs.

```js
X509.packCsrRsaPublicKey(jwk);
X509.packCsrEcPublicKey(jwk);
```

The rest of the CSR code is in [csr.js](https://git.rootprojects.org/root/csr.js).

## Decoders

The keypair format parsers each return a JWK, for convenience.
To conserve memory, they expect taht you give an empty object
as the `jwk` parameter.

If you are using `crv: 'P-384'`, you should pass that in as part
of the otherwise empty JWK.

```js
X509.parsePkcs1(buf, jwk);
X509.parseSec1(buf, jwk);
X509.parsePkcs8(buf, jwk);
X509.parseSpki(buf, jwk);
X509.parsePkix(buf, jwk); // aliase of parseSpki
```

# Contributions

Did this project save you some time? Maybe make your day? Even save the day?

Please say "thanks" via Paypal or Patreon:

-   Paypal: [\$5](https://paypal.me/rootprojects/5) | [\$10](https://paypal.me/rootprojects/10) | Any amount: <paypal@therootcompany.com>
-   Patreon: <https://patreon.com/rootprojects>

Where does your contribution go?

[Root](https://therootcompany.com) is a collection of experts
who trust each other and enjoy working together on deep-tech,
Indie Web projects.

Our goal is to operate as a sustainable community.

Your contributions - both in code and _especially_ monetarily -
help to not just this project, but also our broader work
of [projects](https://rootprojects.org) that fuel the **Indie Web**.

Also, we chat on [Keybase](https://keybase.io)
in [#rootprojects](https://keybase.io/team/rootprojects)

# Commercial Support

Do you need...

-   more features?
-   bugfixes, on _your_ timeline?
-   custom code, built by experts?
-   commercial support and licensing?

<!-- Please visit <https://therootcompany.com> or contact -->

Contact <aj@therootcompany.com> for support options.

# Legal

Copyright [AJ ONeal](https://coolaj86.com),
[Root](https://therootcompany.com) 2018-2019

MPL-2.0 |
[Terms of Use](https://therootcompany.com/legal/#terms) |
[Privacy Policy](https://therootcompany.com/legal/#privacy)
