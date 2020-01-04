# Let's Encrypt&trade; + JavaScript = [ACME.js](https://git.rootprojects.org/root/acme.js)

| Built by [Root](https://therootcompany.com) for [Hub](https://rootprojects.org/hub)

ACME.js is a _low-level_ client for Let's Encrypt.

Looking for an **easy**, _high-level_ client? Check out [Greenlock.js](https://git.rootprojects.org/root/greenlock.js).

```js
var acme = ACME.create({ maintainerEmail, packageAgent, notify });
await acme.init(directoryUrl);

// Create Let's Encrypt Account
var accountOptions = { subscriberEmail, agreeToTerms, accountKey };
var account = await acme.accounts.create(accountOptions);

// Validate Domains
var certificateOptions = { account, accountKey, csr, domains, challenges };
var pems = await acme.certificates.create(certificateOptions);

// Get SSL Certificate
var fullchain = pems.cert + '\n' + pems.chain + '\n';
await fs.promises.writeFile('fullchain.pem', fullchain, 'ascii');
```

# Online Demo

See https://greenlock.domains

<!--

We expect that our hosted versions will meet all of yours needs.
If they don't, please open an issue to let us know why.

We'd much rather improve the app than have a hundred different versions running in the wild.
However, in keeping to our values we've made the source visible for others to inspect, improve, and modify.

-->

# Features

| 15k gzipped | 55k minified | 88k (2,500 loc) source with comments |

Supports the latest (Nov 2019) release of Let's Encrypt in a small, lightweight, Vanilla JS package.

-   [x] Let's Encrypt v2
    -   [x] ACME RFC 8555
    -   [x] November 2019
    -   [x] POST-as-GET
    -   [ ] StartTLS Everywhere&trade; (in-progress)
-   [x] IDN (i.e. `.中国`)
-   [x] ECDSA and RSA keypairs
    -   [x] JWK
    -   [x] PEM
    -   [x] DER
    -   [x] Native Crypto in Node.js
    -   [x] WebCrypto in Browsers
-   [x] Domain Validation Plugins
    -   [x] tls-alpn-01
    -   [x] http-01
    -   [x] dns-01
        -   [x] **Wildcards**
        -   [x] **Localhost**
        -   [x] Private Networks
    -   [x] [Create your own](https://git.rootprojects.org/root/acme-challenge-test.js)
-   [x] Vanilla JS\*
    -   [x] No Transpiling Necessary!
    -   [x] Node.js
    -   [x] Browsers
    -   [x] WebPack
    -   [x] Zero External Dependencies
-   [x] Commercial Support
    -   [x] Safe, Efficient, Maintained

\* Although we use `async/await` in the examples,
the codebase is written entirely in Common JS.

# Use Cases

-   Home Servers
-   IoT
-   Enterprise On-Prem
-   Web Hosting
-   Cloud Services
-   Localhost Development

# API

The public API encapsulates the three high-level steps of the ACME protocol:

1. API Discovery
2. Account Creation
    - Subscriber Agreement
3. Certificate Issuance
    - Certificate Request
    - Authorization Challenges
    - Challenge Presentation
    - Certificate Redemption

## Overview

The core API can be show in just four functions:

```js
ACME.create({ maintainerEmail, packageAgent, notify });
acme.init(directoryUrl);
acme.accounts.create({ subscriberEmail, agreeToTerms, accountKey });
acme.certificates.create({
	customerEmail, // do not use
	account,
	accountKey,
	csr,
	domains,
	challenges
});
```

Helper Functions

```js
ACME.computeChallenge({
	accountKey,
	hostname: 'example.com',
	challenge: { type: 'dns-01', token: 'xxxx' }
});
```

| Parameter          | Description                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| account            | an object containing the Let's Encrypt Account ID as "kid" (misnomer, not actually a key id/thumbprint)     |
| accountKey         | an RSA or EC public/private keypair in JWK format                                                           |
| agreeToTerms       | set to `true` to agree to the Let's Encrypt Subscriber Agreement                                            |
| challenges         | the 'http-01', 'alpn-01', and/or 'dns-01' challenge plugins (`get`, `set`, and `remove` callbacks) to use   |
| csr                | a Certificate Signing Request (CSR), which may be generated with `@root/csr`, openssl, or another           |
| customerEmail      | Don't use this. Given as an example to differentiate between Maintainer, Subscriber, and End-User           |
| directoryUrl       | should be the Let's Encrypt Directory URL<br>`https://acme-staging-v02.api.letsencrypt.org/directory`       |
| domains            | the list of altnames (subject first) that are listed in the CSR and will be listed on the certificate       |
| maintainerEmail    | should be a contact for the author of the code to receive critical bug and security notices                 |
| notify             | all callback for logging events and errors in the form `function (ev, args) { ... }`                        |
| packageAgent       | should be an RFC72321-style user-agent string to append to the ACME client (ex: mypackage/v1.1.1)           |
| skipChallengeTests | do not do a self-check that the ACME-issued challenges will pass (not recommended)                          |
| skipDryRun: false  | do not do a self-check with self-issued challenges (not recommended)                                        |
| subscriberEmail    | should be a contact for the service provider to receive renewal failure notices and manage the ACME account |

**Maintainer vs Subscriber vs Customer**

-   `maintainerEmail` should be the email address of the **author of the code**.
    This person will receive critical security and API change notifications.
-   `subscriberEmail` should be the email of the **admin of the hosting service**.
    This person agrees to the Let's Encrypt Terms of Service and will be notified
    when a certificate fails to renew.
-   `customerEmail` should be the email of individual who owns the domain.
    This is optional (not currently implemented).

Generally speaking **YOU** are the _maintainer_ and you **or your employer** is the _subscriber_.

If you (or your employer) is running any type of service
you **SHOULD NOT** pass the _customer_ email as the subscriber email.

If you are not running a service (you may be building a CLI, for example),
then you should prompt the user for their email address, and they are the subscriber.

## Events

These `notify` events are intended for _logging_ and debugging, NOT as a data API.

| Event Name           | Example Message                                                                   |
| -------------------- | --------------------------------------------------------------------------------- |
| `certificate_order`  | `{ subject: 'example.com', altnames: ['...'], account: { key: { kid: '...' } } }` |
| `challenge_select`   | `{ altname: '*.example.com', type: 'dns-01' }`                                    |
| `challenge_status`   | `{ altname: '*.example.com', type: 'dns-01', status: 'pending' }`                 |
| `challenge_remove`   | `{ altname: '*.example.com', type: 'dns-01' }`                                    |
| `certificate_status` | `{ subject: 'example.com', status: 'valid' }`                                     |
| `warning`            | `{ message: 'what went wrong', description: 'what action to take about it' }`     |
| `error`              | `{ message: 'a background process failed, and it may have side-effects' }`        |

Note: DO NOT rely on **undocumented properties**. They are experimental and **will break**.
If you have a use case for a particular property **open an issue** - we can lock it down and document it.

# Example

### See [examples/README.md](https://git.rootprojects.org/root/acme.js/src/branch/master/examples/README.md)

A basic example includes the following:

1. Initialization
    - maintainer contact
    - package user-agent
    - log events
2. Discover API
    - retrieves Terms of Service and API endpoints
3. Get Subscriber Account
    - create an ECDSA (or RSA) Account key in JWK format
    - agree to terms
    - register account by the key
4. Prepare a Certificate Signing Request
    - create a RSA (or ECDSA) Server key in PEM format
    - select domains
    - choose challenges
    - sign CSR
    - order certificate

[examples/README.md](https://git.rootprojects.org/root/acme.js/src/branch/master/examples/README.md)
covers all of these steps, with comments.

# Install

To make it easy to generate, encode, and decode keys and certificates,
ACME.js uses [Keypairs.js](https://git.rootprojects.org/root/keypairs.js)
and [CSR.js](https://git.rootprojects.org/root/csr.js)

<details>
<summary>Node.js</summary>

```js
npm install --save @root/acme
```

```js
var ACME = require('@root/acme');
```

</details>

<details>
<summary>WebPack</summary>

```html
<meta charset="UTF-8" />
```

(necessary in case the webserver headers don't specify `plain/text; charset="UTF-8"`)

```js
var ACME = require('@root/acme');
```

</details>

<details>
<summary>Vanilla JS</summary>

```html
<meta charset="UTF-8" />
```

(necessary in case the webserver headers don't specify `plain/text; charset="UTF-8"`)

```html
<script src="https://unpkg.com/@root/acme@3.0.0/dist/acme.all.js"></script>
```

`acme.min.js`

```html
<script src="https://unpkg.com/@root/acme@3.0.0/dist/acme.all.min.js"></script>
```

Use

```js
var ACME = window['@root/acme'];
```

</details>

# Challenge Callbacks

The challenge callbacks are documented in the [test suite](https://git.rootprojects.org/root/acme-dns-01-test.js),
essentially:

```js
function create(options) {
	var plugin = {
		init: async function(deps) {
			// for http requests
			plugin.request = deps.request;
		},
		zones: async function(args) {
			// list zones relevant to the altnames
		},
		set: async function(args) {
			// set TXT record
		},
		get: async function(args) {
			// get TXT records
		},
		remove: async function(args) {
			// remove TXT record
		},
		// how long to wait after *all* TXT records are set
		// before presenting them for validation
		propagationDelay: 5000
	};
	return plugin;
}
```

The `http-01` plugin is similar, but without `zones` or `propagationDelay`.

Many challenge plugins are already available for popular platforms.

Search `acme-http-01-` or `acme-dns-01-` on npm to find more.

| Type        | Service                                                                             | Plugin                   |
| ----------- | ----------------------------------------------------------------------------------- | ------------------------ |
| dns-01      | CloudFlare                                                                          | acme-dns-01-cloudflare   |
| dns-01      | [Digital Ocean](https://git.rootprojects.org/root/acme-dns-01-digitalocean.js)      | acme-dns-01-digitalocean |
| dns-01      | [DNSimple](https://git.rootprojects.org/root/acme-dns-01-dnsimple.js)               | acme-dns-01-dnsimple     |
| dns-01      | [DuckDNS](https://git.rootprojects.org/root/acme-dns-01-duckdns.js)                 | acme-dns-01-duckdns      |
| http-01     | File System / [Web Root](https://git.rootprojects.org/root/acme-http-01-webroot.js) | acme-http-01-webroot     |
| dns-01      | [GoDaddy](https://git.rootprojects.org/root/acme-dns-01-godaddy.js)                 | acme-dns-01-godaddy      |
| dns-01      | [Gandi](https://git.rootprojects.org/root/acme-dns-01-gandi.js)                     | acme-dns-01-gandi        |
| dns-01      | [NameCheap](https://git.rootprojects.org/root/acme-dns-01-namecheap.js)             | acme-dns-01-namecheap    |
| dns-01      | [Name&#46;com](https://git.rootprojects.org/root/acme-dns-01-namedotcom.js)         | acme-dns-01-namedotcom   |
| dns-01      | Route53 (AWS)                                                                       | acme-dns-01-route53      |
| http-01     | S3 (AWS, Digital Ocean, Scaleway)                                                   | acme-http-01-s3          |
| dns-01      | [Vultr](https://git.rootprojects.org/root/acme-dns-01-vultr.js)                     | acme-dns-01-vultr        |
| dns-01      | [Build your own](https://git.rootprojects.org/root/acme-dns-01-test.js)             | acme-dns-01-test         |
| http-01     | [Build your own](https://git.rootprojects.org/root/acme-http-01-test.js)            | acme-http-01-test        |
| tls-alpn-01 | [Contact us](mailto:support@therootcompany.com)                                     | -                        |

# Running the Tests

```bash
npm test
```

## Usa a dns-01 challenge

Although you can run the tests from a public facing server, its easiest to do so using a dns-01 challenge.

You will need to use one of the [`acme-dns-01-*` plugins](https://www.npmjs.com/search?q=acme-dns-01-)
to run the test locally.

```bash
ENV=DEV
MAINTAINER_EMAIL=letsencrypt+staging@example.com
SUBSCRIBER_EMAIL=letsencrypt+staging@example.com
BASE_DOMAIN=test.example.com
CHALLENGE_TYPE=dns-01
CHALLENGE_PLUGIN=acme-dns-01-digitalocean
CHALLENGE_OPTIONS='{"token":"xxxxxxxxxxxx"}'
```

### For Example

```bash
# Get the repo and change directories into it
git clone https://git.rootprojects.org/root/acme.js
pushd acme.js/

# Install the challenge plugin you'll use for the tests
npm install --save-dev acme-dns-01-digitalocean
```

## Create a `.env` config

You'll need a `.env` in the project root that looks something like the one in `examples/example.env`:

```bash
# Copy the sample .env file
rsync -av examples/example.env .env

# Edit the config file to use a domain in your account, and your API token
#vim .env
code .env

# Run the tests
node tests/index.js
```

# Developing

Join `@rootprojects` `#general` on [Keybase](https://keybase.io) if you'd like to chat with us.

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

Your contributions - both in code and _especially_ financially -
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

You're welcome to [contact us](mailto:aj@therootcompany.com) in regards to IoT, On-Prem,
Enterprise, and Internal installations, integrations, and deployments.

We have both commercial support and commercial licensing available.

We also offer consulting for all-things-ACME and Let's Encrypt.

# Legal &amp; Rules of the Road

ACME.js&trade; is a [trademark](https://rootprojects.org/legal/#trademark) of AJ ONeal

The rule of thumb is "attribute, but don't confuse". For example:

> Built with [ACME.js](https://git.rootprojects.org/root/acme.js) (a [Root](https://rootprojects.org) project).

Please [contact us](mailto:aj@therootcompany.com) if have any questions in regards to our trademark,
attribution, and/or visible source policies. We want to build great software and a great community.

[ACME.js](https://git.rootprojects.org/root/acme.js) |
MPL-2.0 |
[Terms of Use](https://therootcompany.com/legal/#terms) |
[Privacy Policy](https://therootcompany.com/legal/#privacy)
