#!/usr/bin/env node
// Copyright 2016-2018 AJ ONeal. All rights reserved
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

var certinfo = require('../');
var path = require('path');
var filepath = (process.cwd() + path.sep + 'cert.pem');
var debug = false;
var json;
var cert;

if (/--debug/.test(process.argv[2]) || /--debug/.test(process.argv[3])) {
  debug = true;
}
if (/--json/.test(process.argv[2]) || /--json/.test(process.argv[3])) {
  json = true;
}
if (process.argv[2] && !/^--/.test(process.argv[2])) {
  filepath = process.argv[2];
}
if (process.argv[3] && !/^--/.test(process.argv[3])) {
  filepath = process.argv[3];
}

if (filepath.length > 256) {
  cert = filepath;
}
else {
  cert = require('fs').readFileSync(filepath, 'ascii');
}

if (debug) {
  console.info(JSON.stringify(certinfo.debug(cert), null, '  '));
} else {
  var c = certinfo.info(cert);

  if (json) {
    console.info(JSON.stringify(c, null, '  '));
    return;
  }

  console.info('');

  console.info('Certificate for', c.subject);
  console.info('');
  console.info('Altnames:', c.altnames.join(', '));
  console.info('');
  console.info('Issued at', new Date(c.issuedAt));
  console.info('Expires at', new Date(c.expiresAt));

  console.info('');
}
