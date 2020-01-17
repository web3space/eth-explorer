# @root/csr

Lightweight, Zero-Dependency CSR (Certificate Signing Request) generator and parser for Node.js and Browsers

# Usage

```js
var CSR = require('@root/csr');
var PEM = require('@root/pem/packer');

CSR.csr({
	jwk: jwk,
	domains: ['example.com', '*.example.com', 'foo.bar.example.com'],
	encoding: 'pem'
}).then(function(der) {
	var csr = PEM.packBlock({ type: 'CERTIFICATE REQUEST', bytes: der });
	console.log(csr);
});
```

```txt
-----BEGIN CERTIFICATE REQUEST-----
MIIBHjCBxQIBADAWMRQwEgYDVQQDDAtleGFtcGxlLmNvbTBZMBMGByqGSM49AgEG
CCqGSM49AwEHA0IABFL897BlwE6Tmco/r7LpwVL2BdDx12zZr+BnA/0/PjkI0lsu
013u1+X5fe6vKnOIjcb5obaFnSQixuMGu3qcVnmgTTBLBgkqhkiG9w0BCQ4xPjA8
MDoGA1UdEQQzMDGCC2V4YW1wbGUuY29tgg0qLmV4YW1wbGUuY29tghNmb28uYmFy
LmV4YW1wbGUuY29tMAoGCCqGSM49BAMCA0gAMEUCIADRCWsMYBjm70Hqi08QrOcR
Gcz8uJTe7vZwqOGtykWiAiEA1FTbMskZR9w2ugFWXkWfBdb1W6cD2v6nK+J0wj2r
Q48=
-----END CERTIFICATE REQUEST-----
```

# Advanced Usage

Create an unsigned request

```
var CSR = require('@root/csr');

// Note: this requires the public key to embed it in the request
var hex = CSR.request({
	jwk: jwk,
	domains: ['example.com', '*.example.com', 'foo.bar.example.com'],
  encoding: 'hex'
})
```
