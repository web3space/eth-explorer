#!/bin/bash

# TODO convert to JS
cat browser/base64.js browser/hex.js browser/bytes.js encoding.js > all.tmp.js
sed -i '' '/use strict/d' all.tmp.js
sed -i '' '/require/d' all.tmp.js
sed -i '' '/exports/d' all.tmp.js
echo ';(function () {' > all.js
echo "'use strict';" >> all.js
echo "var Enc = window.Encoding = {};" >> all.js
cat all.tmp.js >> all.js
rm all.tmp.js
echo '}());' >> all.js

mv all.js dist/encoding.all.js
uglifyjs dist/encoding.all.js > dist/encoding.all.min.js
