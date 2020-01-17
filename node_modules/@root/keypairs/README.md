# @root/keypairs

Lightweight JavaScript RSA and ECDSA utils that work on Windows, Mac, and Linux
using modern node.js APIs (no need for C compiler).

A thin wrapper around [Eckles.js (ECDSA)](https://git.coolaj86.com/coolaj86/eckles.js/)
and [Rasha.js (RSA)](https://git.coolaj86.com/coolaj86/rasha.js/).

# Features

-   [x] Generate keypairs
    -   [x] RSA
    -   [x] ECDSA (P-256, P-384)
-   [x] PEM-to-JWK (and SSH-to-JWK)
-   [x] JWK-to-PEM (and JWK-to-SSH)
-   [x] Create JWTs (and sign JWS)
-   [x] SHA256 JWK Thumbprints
-   [ ] JWK fetching. See [Keyfetch.js](https://npmjs.com/packages/keyfetch/)
    -   [ ] OIDC
    -   [ ] Auth0
-   [ ] CLI
    -   See [keypairs-cli](https://npmjs.com/packages/keypairs-cli/)

<!--

  * [ ] generate CSR (DER as PEM or base64url)

-->

# Progress

This is fully functional, but the re-usable code from ACME.js hasn't been fully teased out for the v2.0 release.

(SSH conversions have not yet made it to 2.0)

# Usage

A brief introduction to the APIs:

```js
// generate a new keypair as jwk
// (defaults to EC P-256 when no options are specified)
Keypairs.generate().then(function(pair) {
	console.log(pair.private);
	console.log(pair.public);
});
```

```js
// JWK to PEM
// (supports various 'format' and 'encoding' options)
return Keypairs.export({ jwk: pair.private, format: 'pkcs8' }).then(function(
	pem
) {
	console.log(pem);
});
```

```js
// PEM to JWK
return Keypairs.import({ pem: pem }).then(function(jwk) {
	console.log(jwk);
});
```

```js
// Thumbprint a JWK (SHA256)
return Keypairs.thumbprint({ jwk: jwk }).then(function(thumb) {
	console.log(thumb);
});
```

```js
// Sign a JWT (aka compact JWS)
return Keypairs.signJwt({
  jwk: pair.private
, iss: 'https://example.com'
, exp: '1h'
  // optional claims
, claims: {
  , sub: 'jon.doe@gmail.com'
  }
});
```

By default ECDSA keys will be used since they've had native support in node
_much_ longer than RSA has, and they're smaller, and faster to generate.

## API Overview

-   generate (JWK)
-   parse (PEM)
-   parseOrGenerate (PEM to JWK)
-   import (PEM-to-JWK)
-   export (JWK-to-PEM, private or public)
-   publish (Private JWK to Public JWK)
-   thumbprint (JWK SHA256)
-   signJwt
-   signJws

#### Keypairs.generate(options)

Generates a public/private pair of JWKs as `{ private, public }`

Option examples:

-   RSA `{ kty: 'RSA', modulusLength: 2048 }`
-   ECDSA `{ kty: 'ECDSA', namedCurve: 'P-256' }`

When no options are supplied EC P-256 (also known as `prime256v1` and `secp256r1`) is used by default.

#### Keypairs.parse(options)

Parses either a JWK (encoded as JSON) or an x509 (encdode as PEM) and gives
back the JWK representation.

Option Examples:

-   JWK { key: '{ "kty":"EC", ... }' }
-   PEM { key: '-----BEGIN PRIVATE KEY-----\n...' }
-   Public Key Only { key: '-----BEGIN PRIVATE KEY-----\n...', public: true }
-   Must Have Private Key { key: '-----BEGIN PUBLIC KEY-----\n...', private: true }

Example:

```js
Keypairs.parse({ key: '...' }).catch(function(e) {
	// could not be parsed or was a public key
	console.warn(e);
	return Keypairs.generate();
});
```

#### Keypairs.parseOrGenerate({ key, throw, [generate opts]... })

Parses the key. Logs a warning on failure, marches on.
(a shortcut for the above, with `private: true`)

Option Examples:

-   parse key if exist, otherwise generate `{ key: process.env["PRIVATE_KEY"] }`
-   generated key curve `{ key: null, namedCurve: 'P-256' }`
-   generated key modulus `{ key: null, modulusLength: 2048 }`

Example:

```js
Keypairs.parseOrGenerate({ key: process.env['PRIVATE_KEY'] }).then(function(
	pair
) {
	console.log(pair.public);
});
```

Great for when you have a set of shared keys for development and randomly
generated keys in

#### Keypairs.import({ pem: '...' }

Takes a PEM in pretty much any format (PKCS1, SEC1, PKCS8, SPKI) and returns a JWK.

#### Keypairs.export(options)

Exports a JWK as a PEM.

Exports PEM in PKCS8 (private) or SPKI (public) by default.

Options

```js
{ jwk: jwk
, public: true
, encoding: 'pem' // or 'der'
, format: 'pkcs8' // or 'ssh', 'pkcs1', 'sec1', 'spki'
}
```

#### Keypairs.publish({ jwk: jwk, exp: '3d', use: 'sig' })

Promises a public key that adheres to the OIDC and Auth0 spec (plus expiry), suitable to be published to a JWKs URL:

```
{ "kty": "EC"
, "crv": "P-256"
, "x": "..."
, "y": "..."
, "kid": "..."
, "use": "sig"
, "exp": 1552074208
}
```

In particular this adds "use" and "exp".

#### Keypairs.thumbprint({ jwk: jwk })

Promises a JWK-spec thumbprint: URL Base64-encoded sha256

#### Keypairs.signJwt({ jwk, header, claims })

Returns a JWT (otherwise known as a protected JWS in "compressed" format).

```js
{ jwk: jwk
  // required claims
, iss: 'https://example.com'
, exp: '15m'
  // all optional claims
, claims: {
  }
}
```

Exp may be human readable duration (i.e. 1h, 15m, 30s) or a datetime in seconds.

Header defaults:

```js
{ kid: thumbprint
, alg: 'xS256'
, typ: 'JWT'
}
```

Payload notes:

-   `iat: now` is added by default (set `false` to disable)
-   `exp` must be set (set `false` to disable)
-   `iss` should be the base URL for JWK lookup (i.e. via OIDC, Auth0)

Notes:

`header` is actually the JWS `protected` value, as all JWTs use protected headers (yay!)
and `claims` are really the JWS `payload`.

#### Keypairs.signJws({ jwk, header, protected, payload })

This is provided for APIs like ACME (Let's Encrypt) that use uncompressed JWS (instead of JWT, which is compressed).

Options:

-   `header` not what you think. Leave undefined unless you need this for the spec you're following.
-   `protected` is the typical JWT-style header
    -   `kid` and `alg` will be added by default (these are almost always required), set `false` explicitly to disable
-   `payload` can be JSON, a string, or even a buffer (which gets URL Base64 encoded)
    -   you must set this to something, even if it's an empty string, object, or Buffer

# Additional Documentation

Keypairs.js provides a 1-to-1 mapping to the Rasha.js and Eckles.js APIs for the following:

-   generate(options)
-   import({ pem: '---BEGIN...' })
-   export({ jwk: { kty: 'EC', ... })
-   thumbprint({ jwk: jwk })

If you want to know the algorithm-specific options that are available for those
you'll want to take a look at the corresponding documentation:

-   See ECDSA documentation at [Eckles.js](https://git.coolaj86.com/coolaj86/eckles.js/)
-   See RSA documentation at [Rasha.js](https://git.coolaj86.com/coolaj86/rasha.js/)

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
