'use strict';

var path = require('path');

module.exports = {
	entry: './examples/app.js',
	//entry: './acme.js',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'app.js'
		//filename: 'acme.js',
		//library: '@root/acme',
		//libraryTarget: 'umd'
		//globalObject: "typeof self !== 'undefined' ? self : this"
	},
	resolve: {
		aliasFields: ['webpack', 'browser'],
		mainFields: ['browser', 'main']
	}
};
