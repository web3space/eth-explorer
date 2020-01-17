'use strict';

var fs = require('fs');
var path = require('path');
//var noop = function () {};

// keeping the function signature Promise-friendly
function mkdirp(opts, cb) {
  //if (!cb) { cb = noop; }
  if ('string' === typeof opts) {
    opts = { name: opts };
  }

  if (!opts || !opts.name || 'string' !== typeof opts.name) {
    cb(new Error("mkdirp missing opts.name"));
    return;
  }

  // normalize doesn't account for "../my-sibling/my-neice"
  opts.name = path.resolve(opts.name);
  fs.mkdir(opts.name, function (err) {
    // All's well if all's well
    if (!err) { cb(null, null); return; }

    if ('ENOENT' === err.code) {
      // The only error we care about is the error that we can ostensibly fix
      // (same on Windows, Mac, Linux)
      var name = opts.name;
      opts.name = path.dirname(opts.name);
      mkdirp(opts, function (err) {
        if (err) {
          cb(err);
          return;
        }
        opts.name = name;
        mkdirp(opts, cb);
      });
    } else {
      // Any other error could be something normal and fairly cross platform (like EEXIST),
      // but it could also be something random and weird and platform specific that doesn't
      // actually matter, so we just carry on and try anyway.
      fs.stat(opts.name, function (_err, stat) {
        // if we don't succeed, propagate the original error (which will be more meaningful)
        if (_err || !stat.isDirectory()) {
          cb(err);
          return;
        }
        cb(null, null);
      });
    }
  });
}

module.exports = mkdirp;
