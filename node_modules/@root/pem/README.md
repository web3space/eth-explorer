# @root/pem

Built by [The Root Company](https://therootcompany.com)
for [Greenlock](https://greenlock.domains)
and [ACME.js](https://git.rootprojects.org/root/acme.js)

Lightweight, Zero-Dependency PEM encoder and decoder.

| ~300b gzipped
| ~650b minified
| ~1k full
|

-   [x] Zero Dependencies
-   [x] Universal Support
    -   [x] Node.js
    -   [x] Browsers
-   [x] VanillaJS

This library supports PEM, which is pretty boring on its own.

Most likely you are also interested in some of the following:

-   [keypairs.js](https://git.rootprojects.org/root/keypairs.js)
    -   RSA
    -   EC / ECDSA
-   [x509.js](https://git.rootprojects.org/root/x509.js)
-   [asn1.js](https://git.rootprojects.org/root/asn1.js)

Want to [contribute](#contributions)?
Need [commercial support](#commercial-support)?

# Usage

-   PEM.parseBlock(str)
-   PEM.packBlock(options)

Parsing

```js
var PEM = require('@root/pem/parser');

var block = PEM.parseBlock(
	'-----BEGIN Type-----\nSGVsbG8sIOS4lueVjCE=\n-----END Type-----\n'
);
```

```js
{
	bytes: `<48 65 6c 6c 6f 2c 20 e4 b8 96 e7 95 8c 21>`;
}
```

Packing

```js
var PEM = require('@root/pem/packer');

var block = PEM.packBlock({
  type: 'Type',
  // Buffer or Uint8Array or Array
  bytes: [0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0xe4, 0xb8, 0x96, 0xe7, 0x95, 0x8c, 0x21]
);
```

```txt
-----BEGIN Type-----
SGVsbG8sIOS4lueVjCE=
-----END Type-----
```

# Install

This works equally well in Browsers and Node.js,
but has slightly different code.

## Node (and Webpack)

```bash
npm install --save @root/pem
```

```js
var PEM = require('@root/pem');
```

```js
// just the packer
var PEM = require('@root/pem/packer');
```

```js
// just the parser
var PEM = require('@root/pem/parser');
```

## Browsers (Vanilla JS)

```html
<script src="https://unpkg.com/@root/pem/dist/pem.all.js"></script>
```

```html
<script src="https://unpkg.com/@root/pem/dist/pem.all.min.js"></script>
```

# A PEM Block

A Block represents a PEM encoded structure.

The encoded form is:

```txt
-----BEGIN Type-----
Headers
base64-encoded Bytes
-----END Type-----
```

where Headers is a possibly empty sequence of Key: Value lines.

(credit: https://golang.org/pkg/encoding/pem/)

# PEM History

PEM was introduced in 1993 via RFC 1421, but not formally
standardized until RFC 7468 in April of 2015.

It has served as the _de facto_ standard for a variety of
DER-encoded X509 schemas of ASN.1 data for cryptographic
keys and certificates such as:

-   [x] PKCS#10 (Certificate Signing Request [CSR])
-   [x] X509 Certificate (fullchain.pem, site.crt)
-   [x] PKIX (cert.pem, privkey.pem, priv.key)
    -   [x] PKCS#1 (RSA Public and Private Keys)
    -   [x] PKCS#8 (RSA and ECDSA Keypairs)
-   [x] SEC#1 (ECDSARSA Public and Private Keys)

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

Contact <aj@therootcompany.com> for support options.

# Legal

Copyright [AJ ONeal](https://coolaj86.com),
[Root](https://therootcompany.com) 2018-2019

MPL-2.0 |
[Terms of Use](https://therootcompany.com/legal/#terms) |
[Privacy Policy](https://therootcompany.com/legal/#privacy)
