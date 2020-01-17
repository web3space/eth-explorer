# @root/asn1

Built by [The Root Company](https://therootcompany.com)
for [Greenlock](https://greenlock.domains)
and [ACME.js](https://git.rootprojects.org/root/acme.js)

Lightweight, Zero-Dependency ASN.1 encoder and decoder for Node.js and Browsers,
in less than 300 lines of vanilla JavaScript

| 1.6k gzipped
| 4.2k minified
| 8.4k pretty
|

-   [x] Zero External Dependencies
-   [x] Universal Support
    -   [x] Node.js
    -   [x] Browsers
-   [x] Vanilla JS

This ASN.1 codec is built for simplicity. It encodes into DER format
and decodes into a simple, classless Array of Arrays and values.

Most people don't actually want to work with ANS.1 directly,
but rather intend to work with pre-defined x509 schemas.

If you're **most people**, you're actually looking for one or more of these:

-   [pem.js](https://git.rootprojects.org/root/pem.js)
-   [x509.js](https://git.rootprojects.org/root/x509.js)
-   [csr.js](https://git.rootprojects.org/root/csr.js)
-   [keypairs.js](https://git.rootprojects.org/root/keypairs.js)
-   [encoding.js](https://git.rootprojects.org/root/encoding.js)

Want to [contribute](#contributions)?
Need [commercial support](#commercial-support)?

# Usage

ASN.1 DER consists values which have

-   a type (2-bit class, 6-bit tag)
-   a coded length
-   zero or more values

Common types include:

```txt
0x30 SEQUENCE
0x02 INTEGER*
0x03 BIT STRING**
0x04 OCTET STRING
0x05 NULL
0x06 OBJECT IDENTIFIER
0x0C UTF8String
0x16 IA5String (ASCII)
0x17 UTCTime
0x31 SET
0xA0 context-specific***
0xA3 context-specific***
```

<small>\* INTEGERS are always BigInt-encoded (a leading '00' for positive numbers with a 1 in the most-significant-bit position)</small>

<small>\*\*BIT STRINGS have a leading "bit mask" which, for all practical purposes, is actually _always_ '00'</small>

<small>\*\*\* See <https://stackoverflow.com/a/15071901/151312></small>

The core value in this library is that it:

-   correctly sums the byte length of children elements
-   correctly encodes BigInts

## Parser Usage

There are three options:

-   `der` (required) - the input bytes as a buffer
-   `json` (default) - returns hex strings for values, rather than buffers
-   `verbose` - returns a more human-friendly object that is useful for debugging

```js
ASN1.parse({ der: `<Buffer>`, json: true, verbose: true });
```

Default (hex) output:

```js
[
	'30',
	[
		['02', '01'],
		['04', '2c8996...'],
		['a0', [['06', '2a8648...']]],
		['a1', [['03', '04bdd8...']]]
	]
];
```

Verbose output:

```js
{ type: 48,
  lengthSize: 0,
  length: 119,
  children:
   [ { type: 2, lengthSize: 0, length: 1, value: <Buffer 01> },
     { type: 4,
       lengthSize: 0,
       length: 32,
       value:
        <Buffer 2c 89 96 ...>,
       children: [] },
     { type: 160, lengthSize: 0, length: 10, children: [Array] },
     { type: 161, lengthSize: 0, length: 68, children: [Array] } ] }
```

## Packer Usage

You can use either of two syntaxes. One is much easier to read than the other.

Ironically, hex strings are used in place of buffers for efficiency.

```js
ASN1.Any(hexType, hexBytes1, hexBytes2, ...);
ASN1.UInt(hexBigInt);
ASN1.BitStr(hexBitStream);
```

In practice, you'll be cascading the objects into a final hex string:

```
// result is a hex-encoded DER
var der = hexToBuf(
  ASN1.Any('30'                         // Sequence
  , ASN1.UInt('01')                     // Integer (Version 1)
  , ASN1.Any('04', '07CAD7...')         // Octet String
  , ASN1.Any('A0', '06082A...')         // [0] Object ID (context-specific)
  , ASN1.Any('A1',                      // [1] (context-specific value)
      ASN1.BitStr('04BDD8...')
    )
  )
);
```

Alternatively you can pack either the sparse array or verbose object, using hex strings or buffers:

-   `json` when set to true will return a hex-encoded DER rather than a DER buffer

```js
var buf = Uint8Array.from([0x01]);

ASN1.pack(
	[
		'30',
		[
			['02', buf],
			['04', '07CAD7...'],
			['A0', '06082A...'],
			['A1', ['03', '04BDD8...']]
		]
	],
	{ json: false }
);
```

```js
var buf = Uint8Array.from([0x01]);

ASN1.pack(
	{
		type: 48,
		children: [
			{ type: 2, value: '01' },
			{ type: 4, value: '2c 89 96 ...', children: [] },
			{ type: 160, children: [...] },
			{ type: 161, children: [...] }
		]
	},
	{ json: false }
);
```

# Install

This package contains both node-specific and browser-specific code,
and the `package.json#browser` field ensures that your package manager
will automatically choose the correct code for your environment.

## Node (and Webpack)

```js
npm install -g @root/asn1
```

```js
var asn1 = require('@root/asn1');
```

```js
// just the packer
var asn1 = require('@root/asn1/packer');

// just the parser
var asn1 = require('@root/asn1/parser');
```

## Browsers (Vanilla JS)

```html
<script src="https://unpkg.com/@root/asn1/dist/asn1.all.js"></script>
```

```html
<script src="https://unpkg.com/@root/asn1/dist/asn1.all.min.js"></script>
```

```js
var ASN1 = window.ASN1;
```

# Examples

## Decoding DER to JSON-ASN.1

```js
var PEM = require('@root/pem/packer');
var Enc = require('@root/encoding');
var ASN1 = require('@root/asn1/parser');
```

```js
var pem = [
	'-----BEGIN EC PRIVATE KEY-----',
	'MHcCAQEEICyJlsaqkx2z9yx0H6rHA0lM3/7jXjxqn/VOhExHDuR6oAoGCCqGSM49',
	'AwEHoUQDQgAEvdjQ3T6VBX82LIKDzepYgRsz3HgRwp83yPuonu6vqoshSQRe0Aye',
	'mmdXUDX2wTZsmFSjhY9uroRiBbGZrigbKA==',
	'-----END EC PRIVATE KEY-----'
].join('\n');
```

```js
var der = PEM.parseBlock(pem).bytes;
var asn1 = ASN1.parse({ der: der, json: true, verbose: false });
```

```json
[
	"30",
	[
		["02", "01"],
		[
			"04",
			"2c8996c6aa931db3f72c741faac703494cdffee35e3c6a9ff54e844c470ee47a"
		],
		["a0", [["06", "2a8648ce3d030107"]]],
		[
			"a1",
			[
				[
					"03",
					"04bdd8d0dd3e95057f362c8283cdea58811b33dc7811c29f37c8fba89eeeafaa8b2149045ed00c9e9a67575035f6c1366c9854a3858f6eae846205b199ae281b28"
				]
			]
		]
	]
]
```

```json
{
	"type": 48,
	"lengthSize": 0,
	"length": 119,
	"children": [
		{ "type": 2, "lengthSize": 0, "length": 1, "value": "01" },
		{
			"type": 4,
			"lengthSize": 0,
			"length": 32,
			"value": "2c8996c6aa931db3f72c741faac703494cdffee35e3c6a9ff54e844c470ee47a",
			"children": []
		},
		{
			"type": 160,
			"lengthSize": 0,
			"length": 10,
			"children": [
				{
					"type": 6,
					"lengthSize": 0,
					"length": 8,
					"value": "2a8648ce3d030107"
				}
			]
		},
		{
			"type": 161,
			"lengthSize": 0,
			"length": 68,
			"children": [
				{
					"type": 3,
					"lengthSize": 0,
					"length": 66,
					"value": "04bdd8d0dd3e95057f362c8283cdea58811b33dc7811c29f37c8fba89eeeafaa8b2149045ed00c9e9a67575035f6c1366c9854a3858f6eae846205b199ae281b28",
					"children": []
				}
			]
		}
	]
}
```

## Encoding ASN.1 to DER

Here's an example of an SEC1-encoded EC P-256 Public/Private Keypair:

```js
var ASN1 = require('@root/asn1/packer');
var Enc = require('@root/encoding');
var PEM = require('@root/pem/packer');
```

```js
// 1.2.840.10045.3.1.7
// prime256v1 (ANSI X9.62 named elliptic curve)
var OBJ_ID_EC_256 = '06 08 2A8648CE3D030107';
```

```js
var jwk = {
	crv: 'P-256',
	d: 'LImWxqqTHbP3LHQfqscDSUzf_uNePGqf9U6ETEcO5Ho',
	kty: 'EC',
	x: 'vdjQ3T6VBX82LIKDzepYgRsz3HgRwp83yPuonu6vqos',
	y: 'IUkEXtAMnppnV1A19sE2bJhUo4WPbq6EYgWxma4oGyg',
	kid: 'MnfJYyS9W5gUjrJLdn8ePMzik8ZJz2qc-VZmKOs_oCw'
};
var d = Enc.base64ToHex(jwk.d);
var x = Enc.base64ToHex(jwk.x);
var y = Enc.base64ToHex(jwk.y);
```

```
var der = Enc.hexToBuf(
  ASN1.Any('30'                         // Sequence
  , ASN1.UInt('01')                     // Integer (Version 1)
  , ASN1.Any('04', d)                   // Octet String
  , ASN1.Any('A0', OBJ_ID_EC_256)       // [0] Object ID
  , ASN1.Any('A1',                      // [1] Embedded EC/ASN1 public key
      ASN1.BitStr('04' + x + y)
    )
  )
);

var pem = PEM.packBlock({
  type: 'EC PRIVATE KEY',
  bytes: der
});
```

# Disabiguation

`ASN1.Any(typ, hexVal, ...)`

There was once an actual ASN.1 type with the literal name 'Any'.
It was deprecated in 1994 and the `Any` in this API simply means "give any value"

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
