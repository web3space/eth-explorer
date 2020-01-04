// Copyright 2016-2018 AJ ONeal. All rights reserved
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

var certInfo = module.exports;

var ASN1 = require("./asn1-parser.js").ASN1;
var PEM = require("./asn1-parser.js").PEM;
var Enc = require("./asn1-parser.js").Enc;

Enc.hexToBuf = function (hex) {
  return Buffer.from(hex, 'hex');
};
Enc.bufToUtf8 = function (u8) {
  return Buffer.from(u8).toString('utf8');
};

certInfo.debug = certInfo.getCertInfo = function (pem) {
  var bytes = PEM.parseBlock(pem).bytes;
  return ASN1.parse(bytes);
};

certInfo.info = certInfo.getBasicInfo = function (pem) {
  var c = certInfo.getCertInfo(pem);
  // A cert has 3 parts: cert, signature meta, signature
  if (c.children.length !== 3) {
    throw new Error("doesn't look like a certificate: expected 3 parts of header");
  }
  c = c.children[0];
  if (8 !== c.children.length) {
    throw new Error("doesn't look like a certificate: expected 8 parts to certificate");
  }
  // 0:0 value 2
  // 1 variable-length value
  // 2:0 sha256 identifier 2:1 null
  // 3 certificate of issuer C/O/OU/CN
  // 4:0 notBefore 4:1 notAfter
  var nbf = Enc.hexToBuf(c.children[4].children[0].value);
  var exp = Enc.hexToBuf(c.children[4].children[1].value);
  nbf = new Date(Date.UTC(
    '20' + nbf.slice(0, 2)
  , nbf.slice(2, 4) - 1
  , nbf.slice(4, 6)
  , nbf.slice(6, 8)
  , nbf.slice(8, 10)
  , nbf.slice(10, 12)
  ));
  exp = new Date(Date.UTC(
    '20' + exp.slice(0, 2)
  , exp.slice(2, 4) - 1
  , exp.slice(4, 6)
  , exp.slice(6, 8)
  , exp.slice(8, 10)
  , exp.slice(10, 12)
  ));
  // 5 the client C/O/OU/CN, etc
  var sub = c.children[5].children.filter(function (set) {
    if ('550403' === Enc.bufToHex(set.children[0].children[0].value)) {
      return true;
    }
  }).map(function (set) {
    return Enc.bufToUtf8(set.children[0].children[1].value);
  })[0];
  // 6 public key
  // 7 extensions
  var domains = c.children[7].children[0].children.filter(function (seq) {
    if ('551d11' === Enc.bufToHex(seq.children[0].value)) {
      return true;
    }
  }).map(function (seq) {
    return seq.children[1].children[0].children.map(function (name) {
      return Enc.bufToUtf8(name.value);
    });
  })[0];

  return {
    subject: sub
  , altnames: domains
    // for debugging during console.log
    // do not expect these values to be here
  , _issuedAt: nbf
  , _expiresAt: exp
  , issuedAt: nbf.valueOf()
  , expiresAt: exp.valueOf()
  };
};

certInfo.getCertInfoFromFile = function (pemFile) {
  return require('fs').readFileSync(pemFile, 'ascii');
};

/*
certInfo.testGetCertInfo = function (pathname) {
  var path = require('path');
  var pemFile = pathname || path.join(__dirname, '..', 'tests', 'example.cert.pem');
  return certInfo.getCertInfo(certInfo.getCertInfoFromFile(pemFile));
};

certInfo.testBasicCertInfo = function (pathname) {
  var path = require('path');
  var pemFile = pathname || path.join(__dirname, '..', 'tests', 'example.cert.pem');
  return certInfo.getBasicInfo(certInfo.getCertInfoFromFile(pemFile));
};
*/
