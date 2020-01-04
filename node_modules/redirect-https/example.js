'use strict';

var http = require('http');
var server = http.createServer();
var port = process.argv[2] || 8080;

server.on('request', require('./')({
  port: 8443
, body: 'Redirecting to <a href="{{URL}}">{{HTML_URL}}</a>'
, trustProxy: true // default is false
}));

server.listen(port, function () {
  console.log('Listening on http://localhost.daplie.com:' + server.address().port);
});
