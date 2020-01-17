#!/usr/bin/env node
'use strict';

var fs = require('fs');
var Eckles = require('../ecdsa');

var infile = process.argv[2];
var format = process.argv[3];

if (!infile) {
	infile = 'jwk';
}

if (
	-1 !==
	['jwk', 'pem', 'json', 'der', 'sec1', 'pkcs8', 'spki', 'ssh'].indexOf(
		infile
	)
) {
	console.log('Generating new key...');
	Eckles.generate({
		format: infile,
		namedCurve: format === 'P-384' ? 'P-384' : 'P-256',
		encoding: format === 'der' ? 'der' : 'pem'
	})
		.then(function(key) {
			if ('der' === infile || 'der' === format) {
				key.private = key.private.toString('binary');
				key.public = key.public.toString('binary');
			}
			console.log(key.private);
			console.log(key.public);
		})
		.catch(function(err) {
			console.error(err);
			process.exit(1);
		});
	return;
}

var key = fs.readFileSync(infile, 'ascii');

try {
	key = JSON.parse(key);
} catch (e) {
	// ignore
}

var thumbprint = 'thumbprint' === format;
if (thumbprint) {
	format = 'public';
}

if ('string' === typeof key) {
	if (thumbprint) {
		Eckles.thumbprint({ pem: key }).then(console.log);
		return;
	}
	var pub = -1 !== ['public', 'spki', 'pkix'].indexOf(format);
	Eckles.import({ pem: key, public: pub || format })
		.then(function(jwk) {
			console.log(JSON.stringify(jwk, null, 2));
		})
		.catch(function(err) {
			console.error(err);
			process.exit(1);
		});
} else {
	if (thumbprint) {
		Eckles.thumbprint({ jwk: key }).then(console.log);
		return;
	}
	Eckles.export({ jwk: key, format: format })
		.then(function(pem) {
			console.log(pem);
		})
		.catch(function(err) {
			console.error(err);
			process.exit(2);
		});
}
