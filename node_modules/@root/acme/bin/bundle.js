#!/usr/bin/env node
(async function() {
	'use strict';

	var UglifyJS = require('uglify-js');
	var path = require('path');
	var fs = require('fs');
	var promisify = require('util').promisify;
	var readFile = promisify(fs.readFile);
	var writeFile = promisify(fs.writeFile);
	var gzip = promisify(require('zlib').gzip);

	// The order is specific, and it matters
	var files = await Promise.all(
		[
			'../lib/encoding.js',
			'../lib/asn1-packer.js',
			'../lib/x509.js',
			'../lib/ecdsa.js',
			'../lib/rsa.js',
			'../lib/keypairs.js',
			'../lib/asn1-parser.js',
			'../lib/csr.js',
			'../lib/acme.js'
		].map(async function(file) {
			return (await readFile(path.join(__dirname, file), 'utf8')).trim();
		})
	);

	var header =
		[
			'// Copyright 2015-2019 AJ ONeal. All rights reserved',
			'/* This Source Code Form is subject to the terms of the Mozilla Public',
			' * License, v. 2.0. If a copy of the MPL was not distributed with this',
			' * file, You can obtain one at http://mozilla.org/MPL/2.0/. */'
		].join('\n') + '\n';

	var file = header + files.join('\n') + '\n';
	await writeFile(path.join(__dirname, '../dist', 'acme.js'), file);
	await writeFile(
		path.join(__dirname, '../dist', 'acme.js.gz'),
		await gzip(file)
	);

	// TODO source maps?
	var result = UglifyJS.minify(file, {
		compress: true,
		// mangling doesn't save significant
		mangle: false
	});
	if (result.error) {
		throw result.error;
	}
	file = header + result.code;
	await writeFile(path.join(__dirname, '../dist', 'acme.min.js'), file);
	await writeFile(
		path.join(__dirname, '../dist', 'acme.min.js.gz'),
		await gzip(file)
	);
})();
