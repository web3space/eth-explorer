# [mkdirp.js](https://git.rootprojects.org/root/mkdirp.js) | A [Root](https://rootprojects.org) Project

A zero-dependency, Promise-friendly mkdirp written in VanillaJS for node.

# Install

```js
npm install --save @root/mkdirp
```

# Usage

```js
'use strict';

var mkdirp = require('@root/mkdirp')
mkdirp('/path/to/whatever', function (err) {
  if (err) { throw err; }
  console.log("directory now exists");
});
```

# Usage (Promise)

```js
'use strict';

var util = require('util');
var mkdirp = util.promisify(require('@root/mkdirp'));

mkdirp('/path/to/whatever').then(function () {
  console.info("directory now exists");
}).catch(function (err) {
  console.error(err);
});
```

## Why not substack's mkdirp?

We're serious about light, zero-dependency JavaScript.

Fewer dependencies means code that's more easily audited, and less surface area for attacks.

substack's implementation is excellent and well-tested,
but it's not Promise / await friendly and it depends on minimist,
which isn't necessary because we don't need the commandline usage.
