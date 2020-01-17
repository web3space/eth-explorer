'use strict';

var opts = { port: 0 };
var redirect = require('./')(opts);

function r80to443() {
  // using port 80 and 443
  opts.port = 443;
  var req = { connection: {}, headers: { host: 'example.com' }, url: '/path/to/somewhere.html' };
  var res = {
    setHeader: function () {}
  , end: function (body) {
      if (!/:/.test(body)) {
        throw new Error("test didn't pass with port 80 redirecting to 443");
      }
      console.log('PASS: 80 to 443');
    }
  };
  var next = function () {};
  redirect(req, res, next);
}

function r80to8443() {
  // using port 80, but not 443
  opts.port = 8443;
  var req = { connection: {}, headers: { host: 'example.com' }, url: '/path/to/somewhere.html' };
  var res = {
    setHeader: function () {}
  , end: function (body) {
      if (!/:8443/.test(body)) {
        throw new Error("test didn't pass with port 80 redirecting to non-443");
      }
      console.log('PASS: 80 to 8443');
    }
  };
  var next = function () {};
  redirect(req, res, next);
}

function r4080to8443() {
  // using port 80 and 443
  opts.port = 8443;
  var req = { connection: {}, headers: { host: 'example.com:4080' }, url: '/path/to/somewhere.html' };
  var res = {
    setHeader: function () {}
  , end: function (body) {
      if (!/:8443/.test(body)) {
        throw new Error("test didn't pass with port 4080 redirecting to 8443");
      }
      console.log('PASS: 4080 to 8443');
    }
  };
  var next = function () {};
  redirect(req, res, next);
}

function r4080to443() {
  // using port 80 and 443
  opts.port = 8443;
  var req = { connection: {}, headers: { host: 'example.com:4080' }, url: '/path/to/somewhere.html' };
  var res = {
    setHeader: function () {}
  , end: function (body) {
      if (/:/.test(body)) {
        throw new Error("test didn't pass with port 4080 redirecting to 8443");
      }
      console.log('PASS: 4080 to 8443');
    }
  };
  var next = function () {};
  redirect(req, res, next);
}

r80to443();
r80to8443();
r4080to8443();
//r4080to443();
