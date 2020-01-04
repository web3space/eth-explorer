;(function () {
'use strict';
var Enc = window.Encoding = {};


// To Base64

Enc.bufToBase64 = function(u8) {
	var bin = '';
	u8.forEach(function(i) {
		bin += String.fromCharCode(i);
	});
	return btoa(bin);
};

Enc.strToBase64 = function(str) {
	return btoa(Enc.strToBin(str));
};

// From Base64

function _base64ToBin(b64) {
	return atob(Enc.urlBase64ToBase64(b64));
}

Enc._base64ToBin = _base64ToBin;

Enc.base64ToBuf = function(b64) {
	return Enc.binToBuf(_base64ToBin(b64));
};

Enc.base64ToStr = function(b64) {
	return Enc.binToStr(_base64ToBin(b64));
};

// URL Safe Base64

Enc.urlBase64ToBase64 = function(u64) {
	var r = u64 % 4;
	if (2 === r) {
		u64 += '==';
	} else if (3 === r) {
		u64 += '=';
	}
	return u64.replace(/-/g, '+').replace(/_/g, '/');
};

Enc.base64ToUrlBase64 = function(b64) {
	return b64
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
};

Enc.bufToUrlBase64 = function(buf) {
	return Enc.base64ToUrlBase64(Enc.bufToBase64(buf));
};

Enc.strToUrlBase64 = function(str) {
	return Enc.bufToUrlBase64(Enc.strToBuf(str));
};



// To Hex

Enc.bufToHex = function(u8) {
	var hex = [];
	var i, h;
	var len = u8.byteLength || u8.length;

	for (i = 0; i < len; i += 1) {
		h = u8[i].toString(16);
		if (2 !== h.length) {
			h = '0' + h;
		}
		hex.push(h);
	}

	return hex.join('').toLowerCase();
};

Enc.numToHex = function(d) {
	d = d.toString(16); // .padStart(2, '0');
	if (d.length % 2) {
		return '0' + d;
	}
	return d;
};

Enc.strToHex = function(str) {
	return Enc._binToHex(Enc.strToBin(str));
};

Enc._binToHex = function(bin) {
	return bin
		.split('')
		.map(function(ch) {
			var h = ch.charCodeAt(0).toString(16);
			if (2 !== h.length) {
				h = '0' + h;
			}
			return h;
		})
		.join('');
};

// From Hex

Enc.hexToBuf = function(hex) {
	var arr = [];
	hex.match(/.{2}/g).forEach(function(h) {
		arr.push(parseInt(h, 16));
	});
	return 'undefined' !== typeof Uint8Array ? new Uint8Array(arr) : arr;
};

Enc.hexToStr = function(hex) {
	return Enc.binToStr(_hexToBin(hex));
};

function _hexToBin(hex) {
	return hex.replace(/([0-9A-F]{2})/gi, function(_, p1) {
		return String.fromCharCode('0x' + p1);
	});
}

Enc._hexToBin = _hexToBin;



// to Binary String

Enc.bufToBin = function(buf) {
	var bin = '';
	// cannot use .map() because Uint8Array would return only 0s
	buf.forEach(function(ch) {
		bin += String.fromCharCode(ch);
	});
	return bin;
};

Enc.strToBin = function(str) {
	// Note: TextEncoder might be faster (or it might be slower, I don't know),
	// but it doesn't solve the double-utf8 problem and MS Edge still has users without it
	var escstr = encodeURIComponent(str);
	// replaces any uri escape sequence, such as %0A,
	// with binary escape, such as 0x0A
	var binstr = escstr.replace(/%([0-9A-F]{2})/g, function(_, p1) {
		return String.fromCharCode('0x' + p1);
	});
	return binstr;
};

// to Buffer

Enc.binToBuf = function(bin) {
	var arr = bin.split('').map(function(ch) {
		return ch.charCodeAt(0);
	});
	return 'undefined' !== typeof Uint8Array ? new Uint8Array(arr) : arr;
};

Enc.strToBuf = function(str) {
	return Enc.binToBuf(Enc.strToBin(str));
};

// to Unicode String

Enc.binToStr = function(binstr) {
	var escstr = binstr.replace(/(.)/g, function(m, p) {
		var code = p
			.charCodeAt(0)
			.toString(16)
			.toUpperCase();
		if (code.length < 2) {
			code = '0' + code;
		}
		return '%' + code;
	});

	return decodeURIComponent(escstr);
};

Enc.bufToStr = function(buf) {
	return Enc.binToStr(Enc.bufToBin(buf));
};

// Base64 + Hex

Enc.base64ToHex = function(b64) {
	return Enc.bufToHex(Enc.base64ToBuf(b64));
};

Enc.hexToBase64 = function(hex) {
	return btoa(Enc._hexToBin(hex));
};

}());
;(function () {
'use strict';
var ASN1 = window.ASN1 = {};
var Enc = window.Encoding;
// Copyright 2018 AJ ONeal. All rights reserved
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


//
// Parser
//

// Although I've only seen 9 max in https certificates themselves,
// but each domain list could have up to 100
ASN1.ELOOPN = 102;
ASN1.ELOOP =
	'uASN1.js Error: iterated over ' +
	ASN1.ELOOPN +
	'+ elements (probably a malformed file)';
// I've seen https certificates go 29 deep
ASN1.EDEEPN = 60;
ASN1.EDEEP =
	'uASN1.js Error: element nested ' +
	ASN1.EDEEPN +
	'+ layers deep (probably a malformed file)';
// Container Types are Sequence 0x30, Container Array? (0xA0, 0xA1)
// Value Types are Boolean 0x01, Integer 0x02, Null 0x05, Object ID 0x06, String 0x0C, 0x16, 0x13, 0x1e Value Array? (0x82)
// Bit String (0x03) and Octet String (0x04) may be values or containers
// Sometimes Bit String is used as a container (RSA Pub Spki)
ASN1.CTYPES = [0x30, 0x31, 0xa0, 0xa1];
ASN1.VTYPES = [0x01, 0x02, 0x05, 0x06, 0x0c, 0x82];
ASN1.parseVerbose = function parseAsn1Helper(buf, opts) {
	if (!opts) {
		opts = {};
	}
	//var ws = '  ';
	function parseAsn1(buf, depth, eager) {
		if (depth.length >= ASN1.EDEEPN) {
			throw new Error(ASN1.EDEEP);
		}

		var index = 2; // we know, at minimum, data starts after type (0) and lengthSize (1)
		var asn1 = { type: buf[0], lengthSize: 0, length: buf[1] };
		var child;
		var iters = 0;
		var adjust = 0;
		var adjustedLen;

		// Determine how many bytes the length uses, and what it is
		if (0x80 & asn1.length) {
			asn1.lengthSize = 0x7f & asn1.length;
			// I think that buf->hex->int solves the problem of Endianness... not sure
			asn1.length = parseInt(
				Enc.bufToHex(buf.slice(index, index + asn1.lengthSize)),
				16
			);
			index += asn1.lengthSize;
		}

		// High-order bit Integers have a leading 0x00 to signify that they are positive.
		// Bit Streams use the first byte to signify padding, which x.509 doesn't use.
		if (0x00 === buf[index] && (0x02 === asn1.type || 0x03 === asn1.type)) {
			// However, 0x00 on its own is a valid number
			if (asn1.length > 1) {
				index += 1;
				adjust = -1;
			}
		}
		adjustedLen = asn1.length + adjust;

		//console.warn(depth.join(ws) + '0x' + Enc.numToHex(asn1.type), index, 'len:', asn1.length, asn1);

		function parseChildren(eager) {
			asn1.children = [];
			//console.warn('1 len:', (2 + asn1.lengthSize + asn1.length), 'idx:', index, 'clen:', 0);
			while (
				iters < ASN1.ELOOPN &&
				index < 2 + asn1.length + asn1.lengthSize
			) {
				iters += 1;
				depth.length += 1;
				child = parseAsn1(
					buf.slice(index, index + adjustedLen),
					depth,
					eager
				);
				depth.length -= 1;
				// The numbers don't match up exactly and I don't remember why...
				// probably something with adjustedLen or some such, but the tests pass
				index += 2 + child.lengthSize + child.length;
				//console.warn('2 len:', (2 + asn1.lengthSize + asn1.length), 'idx:', index, 'clen:', (2 + child.lengthSize + child.length));
				if (index > 2 + asn1.lengthSize + asn1.length) {
					if (!eager) {
						console.error(JSON.stringify(asn1, ASN1._replacer, 2));
					}
					throw new Error(
						'Parse error: child value length (' +
							child.length +
							') is greater than remaining parent length (' +
							(asn1.length - index) +
							' = ' +
							asn1.length +
							' - ' +
							index +
							')'
					);
				}
				asn1.children.push(child);
				//console.warn(depth.join(ws) + '0x' + Enc.numToHex(asn1.type), index, 'len:', asn1.length, asn1);
			}
			if (index !== 2 + asn1.lengthSize + asn1.length) {
				//console.warn('index:', index, 'length:', (2 + asn1.lengthSize + asn1.length));
				throw new Error('premature end-of-file');
			}
			if (iters >= ASN1.ELOOPN) {
				throw new Error(ASN1.ELOOP);
			}

			delete asn1.value;
			return asn1;
		}

		// Recurse into types that are _always_ containers
		if (-1 !== ASN1.CTYPES.indexOf(asn1.type)) {
			return parseChildren(eager);
		}

		// Return types that are _always_ values
		asn1.value = buf.slice(index, index + adjustedLen);
		if (opts.json) {
			asn1.value = Enc.bufToHex(asn1.value);
		}
		if (-1 !== ASN1.VTYPES.indexOf(asn1.type)) {
			return asn1;
		}

		// For ambigious / unknown types, recurse and return on failure
		// (and return child array size to zero)
		try {
			return parseChildren(true);
		} catch (e) {
			asn1.children.length = 0;
			return asn1;
		}
	}

	var asn1 = parseAsn1(buf, []);
	var len = buf.byteLength || buf.length;
	if (len !== 2 + asn1.lengthSize + asn1.length) {
		throw new Error(
			'Length of buffer does not match length of ASN.1 sequence.'
		);
	}
	return asn1;
};
ASN1._toArray = function toArray(next, opts) {
	var typ = opts.json ? Enc.numToHex(next.type) : next.type;
	var val = next.value;
	if (val) {
		if ('string' !== typeof val && opts.json) {
			val = Enc.bufToHex(val);
		}
		return [typ, val];
	}
	return [
		typ,
		next.children.map(function(child) {
			return toArray(child, opts);
		})
	];
};
ASN1.parse = function(opts) {
	var opts2 = { json: false !== opts.json };
	var verbose = ASN1.parseVerbose(opts.der, opts2);
	if (opts.verbose) {
		return verbose;
	}
	return ASN1._toArray(verbose, opts2);
};
ASN1._replacer = function(k, v) {
	if ('type' === k) {
		return '0x' + Enc.numToHex(v);
	}
	if (v && 'value' === k) {
		return '0x' + Enc.bufToHex(v.data || v);
	}
	return v;
};


//
// Packer
//

// Almost every ASN.1 type that's important for CSR
// can be represented generically with only a few rules.
function Any(/*type, hexstrings...*/) {
	var args = Array.prototype.slice.call(arguments);
	var typ = args.shift();
	var str = args
		.join('')
		.replace(/\s+/g, '')
		.toLowerCase();
	var len = str.length / 2;
	var lenlen = 0;
	var hex = typ;
	if ('number' === typeof hex) {
		hex = Enc.numToHex(hex);
	}

	// We can't have an odd number of hex chars
	if (len !== Math.round(len)) {
		throw new Error('invalid hex');
	}

	// The first byte of any ASN.1 sequence is the type (Sequence, Integer, etc)
	// The second byte is either the size of the value, or the size of its size

	// 1. If the second byte is < 0x80 (128) it is considered the size
	// 2. If it is > 0x80 then it describes the number of bytes of the size
	//    ex: 0x82 means the next 2 bytes describe the size of the value
	// 3. The special case of exactly 0x80 is "indefinite" length (to end-of-file)

	if (len > 127) {
		lenlen += 1;
		while (len > 255) {
			lenlen += 1;
			len = len >> 8;
		}
	}

	if (lenlen) {
		hex += Enc.numToHex(0x80 + lenlen);
	}
	return hex + Enc.numToHex(str.length / 2) + str;
}
ASN1.Any = Any;

// The Integer type has some special rules
ASN1.UInt = function UINT() {
	var str = Array.prototype.slice.call(arguments).join('');
	var first = parseInt(str.slice(0, 2), 16);

	// If the first byte is 0x80 or greater, the number is considered negative
	// Therefore we add a '00' prefix if the 0x80 bit is set
	if (0x80 & first) {
		str = '00' + str;
	}

	return Any('02', str);
};

// The Bit String type also has a special rule
ASN1.BitStr = function BITSTR() {
	var str = Array.prototype.slice.call(arguments).join('');
	// '00' is a mask of how many bits of the next byte to ignore
	return Any('03', '00' + str);
};

ASN1._toArray = function toArray(next, opts) {
	var typ = opts.json ? Enc.numToHex(next.type) : next.type;
	var val = next.value;
	if (val) {
		if ('string' !== typeof val && opts.json) {
			val = Enc.bufToHex(val);
		}
		return [typ, val];
	}
	return [
		typ,
		next.children.map(function(child) {
			return toArray(child, opts);
		})
	];
};

ASN1._pack = function(arr) {
	var typ = arr[0];
	if ('number' === typeof arr[0]) {
		typ = Enc.numToHex(arr[0]);
	}
	var str = '';
	if (Array.isArray(arr[1])) {
		arr[1].forEach(function(a) {
			str += ASN1._pack(a);
		});
	} else if ('string' === typeof arr[1]) {
		str = arr[1];
	} else if (arr[1].byteLength) {
		str = Enc.bufToHex(arr[1]);
	} else {
		throw new Error('unexpected array');
	}
	if ('03' === typ) {
		return ASN1.BitStr(str);
	} else if ('02' === typ) {
		return ASN1.UInt(str);
	} else {
		return Any(typ, str);
	}
};

// TODO should this return a buffer?
ASN1.pack = function(asn1, opts) {
	if (!opts) {
		opts = {};
	}
	if (!Array.isArray(asn1)) {
		asn1 = ASN1._toArray(asn1, { json: true });
	}
	var result = ASN1._pack(asn1);
	if (opts.json) {
		return result;
	}
	return Enc.hexToBuf(result);
};
}());
;(function () {
'use strict';
var X509 = window.X509 = {};
var ASN1 = window.ASN1;
var Enc = window.Encoding;


// 1.2.840.10045.3.1.7
// prime256v1 (ANSI X9.62 named elliptic curve)
var OBJ_ID_EC = '06 08 2A8648CE3D030107'.replace(/\s+/g, '').toLowerCase();
// 1.3.132.0.34
// secp384r1 (SECG (Certicom) named elliptic curve)
var OBJ_ID_EC_384 = '06 05 2B81040022'.replace(/\s+/g, '').toLowerCase();

X509.parsePkcs1 = function parseRsaPkcs1(asn1, jwk) {
	if (!jwk) {
		jwk = {};
	}

	// might be a buffer
	if (asn1.byteLength) {
		asn1 = ASN1.parse({ der: asn1, verbose: true, json: false });
	}

	if (
		!asn1.children.every(function(el) {
			return 0x02 === el.type;
		})
	) {
		throw new Error(
			'not an RSA PKCS#1 public or private key (not all ints)'
		);
	}

	if (2 === asn1.children.length) {
		jwk.n = Enc.bufToUrlBase64(asn1.children[0].value);
		jwk.e = Enc.bufToUrlBase64(asn1.children[1].value);
		jwk.kty = 'RSA';
	} else if (asn1.children.length >= 9) {
		// the standard allows for "otherPrimeInfos", hence at least 9

		jwk.n = Enc.bufToUrlBase64(asn1.children[1].value);
		jwk.e = Enc.bufToUrlBase64(asn1.children[2].value);
		jwk.d = Enc.bufToUrlBase64(asn1.children[3].value);
		jwk.p = Enc.bufToUrlBase64(asn1.children[4].value);
		jwk.q = Enc.bufToUrlBase64(asn1.children[5].value);
		jwk.dp = Enc.bufToUrlBase64(asn1.children[6].value);
		jwk.dq = Enc.bufToUrlBase64(asn1.children[7].value);
		jwk.qi = Enc.bufToUrlBase64(asn1.children[8].value);
		jwk.kty = 'RSA';
	} else {
		throw new Error(
			'not an RSA PKCS#1 public or private key (wrong number of ints)'
		);
	}

	return jwk;
};

X509.parseSec1 = function parseEcOnlyPrivkey(u8, jwk) {
	var index = 7;
	var len = 32;
	var olen = OBJ_ID_EC.length / 2;

	if ('P-384' === jwk.crv) {
		olen = OBJ_ID_EC_384.length / 2;
		index = 8;
		len = 48;
	}
	if (len !== u8[index - 1]) {
		throw new Error('Unexpected bitlength ' + len);
	}

	// private part is d
	var d = u8.slice(index, index + len);
	// compression bit index
	var ci = index + len + 2 + olen + 2 + 3;
	var c = u8[ci];
	var x, y;

	if (0x04 === c) {
		y = u8.slice(ci + 1 + len, ci + 1 + len + len);
	} else if (0x02 !== c) {
		throw new Error('not a supported EC private key');
	}
	x = u8.slice(ci + 1, ci + 1 + len);

	return {
		kty: jwk.kty || 'EC',
		crv: jwk.crv || 'P-256',
		d: Enc.bufToUrlBase64(d),
		//, dh: Enc.bufToHex(d)
		x: Enc.bufToUrlBase64(x),
		//, xh: Enc.bufToHex(x)
		y: Enc.bufToUrlBase64(y)
		//, yh: Enc.bufToHex(y)
	};
};

X509.parsePkcs8 = function(u8, jwk) {
	try {
		return X509.parseRsaPkcs8(u8, jwk);
	} catch (e) {
		return X509.parseEcPkcs8(u8, jwk);
	}
};

X509.parseEcPkcs8 = function parseEcPkcs8(u8, jwk) {
	var index = 24 + OBJ_ID_EC.length / 2;
	var len = 32;
	if ('P-384' === jwk.crv) {
		index = 24 + OBJ_ID_EC_384.length / 2 + 2;
		len = 48;
	}

	if (0x04 !== u8[index]) {
		throw new Error('privkey not found');
	}
	var d = u8.slice(index + 2, index + 2 + len);
	var ci = index + 2 + len + 5;
	var xi = ci + 1;
	var x = u8.slice(xi, xi + len);
	var yi = xi + len;
	var y;
	if (0x04 === u8[ci]) {
		y = u8.slice(yi, yi + len);
	} else if (0x02 !== u8[ci]) {
		throw new Error('invalid compression bit (expected 0x04 or 0x02)');
	}

	return {
		kty: jwk.kty || 'EC',
		crv: jwk.crv || 'P-256',
		d: Enc.bufToUrlBase64(d),
		//, dh: Enc.bufToHex(d)
		x: Enc.bufToUrlBase64(x),
		//, xh: Enc.bufToHex(x)
		y: Enc.bufToUrlBase64(y)
		//, yh: Enc.bufToHex(y)
	};
};

X509.parseRsaPkcs8 = function parseRsaPkcs8(asn1, jwk) {
	if (!jwk) {
		jwk = {};
	}

	// might be a buffer
	if (asn1.byteLength) {
		asn1 = ASN1.parse({ der: asn1, verbose: true, json: false });
	}
	if (
		2 === asn1.children.length &&
		0x03 === asn1.children[1].type // && 2 === asn1.children[1].children.length
	) {
		asn1 = asn1.children[1].children[0];
		jwk.n = Enc.bufToUrlBase64(asn1.children[0].value);
		jwk.e = Enc.bufToUrlBase64(asn1.children[1].value);
		jwk.kty = 'RSA';
	} else if (
		3 === asn1.children.length &&
		0x04 === asn1.children[2].type &&
		0x30 === asn1.children[2].children[0].type &&
		0x02 === asn1.children[2].children[0].children[0].type
	) {
		asn1 = asn1.children[2].children[0];
		jwk.n = Enc.bufToUrlBase64(asn1.children[1].value);
		jwk.e = Enc.bufToUrlBase64(asn1.children[2].value);
		jwk.d = Enc.bufToUrlBase64(asn1.children[3].value);
		jwk.p = Enc.bufToUrlBase64(asn1.children[4].value);
		jwk.q = Enc.bufToUrlBase64(asn1.children[5].value);
		jwk.dp = Enc.bufToUrlBase64(asn1.children[6].value);
		jwk.dq = Enc.bufToUrlBase64(asn1.children[7].value);
		jwk.qi = Enc.bufToUrlBase64(asn1.children[8].value);
		jwk.kty = 'RSA';
	} else {
		throw new Error(
			'not an RSA PKCS#8 public or private key (wrong format)'
		);
	}

	return jwk;
};

X509.parseSpki = function(buf, jwk) {
	try {
		return X509.parseRsaPkcs8(buf, jwk);
	} catch (e) {
		return X509.parseEcSpki(buf, jwk);
	}
};

X509.parseEcSpki = function(u8, jwk) {
	var ci = 16 + OBJ_ID_EC.length / 2;
	var len = 32;

	if ('P-384' === jwk.crv) {
		ci = 16 + OBJ_ID_EC_384.length / 2;
		len = 48;
	}

	var c = u8[ci];
	var xi = ci + 1;
	var x = u8.slice(xi, xi + len);
	var yi = xi + len;
	var y;
	if (0x04 === c) {
		y = u8.slice(yi, yi + len);
	} else if (0x02 !== c) {
		throw new Error('not a supported EC private key');
	}

	return {
		kty: jwk.kty || 'EC',
		crv: jwk.crv || 'P-256',
		x: Enc.bufToUrlBase64(x),
		//, xh: Enc.bufToHex(x)
		y: Enc.bufToUrlBase64(y)
		//, yh: Enc.bufToHex(y)
	};
};

X509.parsePkix = X509.parseSpki;

// TODO look for ECDSA as well
X509._parseRsa = function(asn1) {
	// accepting der for compatability with other usages

	if (asn1.byteLength) {
		asn1 = ASN1.parse({ der: asn1, verbose: true, json: false });
	}

	var meta = { kty: 'RSA', format: 'pkcs1', public: true };
	//meta.asn1 = ASN1.parse(u8);

	if (
		asn1.children.every(function(el) {
			return 0x02 === el.type;
		})
	) {
		if (2 === asn1.children.length) {
			// rsa pkcs1 public
			//return meta;
		} else if (asn1.children.length >= 9) {
			// the standard allows for "otherPrimeInfos", hence at least 9
			meta.public = false;
			// rsa pkcs1 private
			//return meta;
		} else {
			throw new Error(
				'not an RSA PKCS#1 public or private key (wrong number of ints)'
			);
		}
	} else {
		meta.format = 'pkcs8';
	}

	var jwk = { kty: 'RSA', n: null, e: null };
	if ('pkcs1' === meta.format) {
		return X509.parsePkcs1(asn1, jwk);
	} else {
		return X509.parsePkcs8(asn1, jwk);
	}
};


// 1.2.840.10045.3.1.7
// prime256v1 (ANSI X9.62 named elliptic curve)
var OBJ_ID_EC = '06 08 2A8648CE3D030107'.replace(/\s+/g, '').toLowerCase();
// 1.3.132.0.34
// secp384r1 (SECG (Certicom) named elliptic curve)
var OBJ_ID_EC_384 = '06 05 2B81040022'.replace(/\s+/g, '').toLowerCase();
// 1.2.840.10045.2.1
// ecPublicKey (ANSI X9.62 public key type)
var OBJ_ID_EC_PUB = '06 07 2A8648CE3D0201'.replace(/\s+/g, '').toLowerCase();

var Asn1 = ASN1.Any;
var UInt = ASN1.UInt;
var BitStr = ASN1.BitStr;

X509.packPkcs1 = function(jwk) {
	var n = UInt(Enc.base64ToHex(jwk.n));
	var e = UInt(Enc.base64ToHex(jwk.e));

	if (!jwk.d) {
		return Enc.hexToBuf(Asn1('30', n, e));
	}

	return Enc.hexToBuf(
		Asn1(
			'30',
			UInt('00'),
			n,
			e,
			UInt(Enc.base64ToHex(jwk.d)),
			UInt(Enc.base64ToHex(jwk.p)),
			UInt(Enc.base64ToHex(jwk.q)),
			UInt(Enc.base64ToHex(jwk.dp)),
			UInt(Enc.base64ToHex(jwk.dq)),
			UInt(Enc.base64ToHex(jwk.qi))
		)
	);
};

X509.packSec1 = function(jwk) {
	var d = Enc.base64ToHex(jwk.d);
	var x = Enc.base64ToHex(jwk.x);
	var y = Enc.base64ToHex(jwk.y);
	var objId = 'P-256' === jwk.crv ? OBJ_ID_EC : OBJ_ID_EC_384;

	return Enc.hexToBuf(
		Asn1(
			'30',
			UInt('01'),
			Asn1('04', d),
			Asn1('A0', objId),
			Asn1('A1', BitStr('04' + x + y))
		)
	);
};
/**
 * take a private jwk and creates a der from it
 * @param {*} jwk
 */
X509.packPkcs8 = function(jwk) {
	if (/RSA/.test(jwk.kty)) {
		return X509.packPkcs8Rsa(jwk);
	}

	return X509.packPkcs8Ec(jwk);
};
X509.packPkcs8Ec = function(jwk) {
	var d = Enc.base64ToHex(jwk.d);
	var x = Enc.base64ToHex(jwk.x);
	var y = Enc.base64ToHex(jwk.y);
	var objId = 'P-256' === jwk.crv ? OBJ_ID_EC : OBJ_ID_EC_384;
	return Enc.hexToBuf(
		Asn1(
			'30',
			UInt('00'),
			Asn1('30', OBJ_ID_EC_PUB, objId),
			Asn1(
				'04',
				Asn1(
					'30',
					UInt('01'),
					Asn1('04', d),
					Asn1('A1', BitStr('04' + x + y))
				)
			)
		)
	);
};

X509.packPkcs8Rsa = function(jwk) {
	if (!jwk.d) {
		// Public RSA
		return Enc.hexToBuf(
			Asn1(
				'30',
				Asn1('30', Asn1('06', '2a864886f70d010101'), Asn1('05')),
				BitStr(
					Asn1(
						'30',
						UInt(Enc.base64ToHex(jwk.n)),
						UInt(Enc.base64ToHex(jwk.e))
					)
				)
			)
		);
	}

	// Private RSA
	return Enc.hexToBuf(
		Asn1(
			'30',
			UInt('00'),
			Asn1('30', Asn1('06', '2a864886f70d010101'), Asn1('05')),
			Asn1(
				'04',
				Asn1(
					'30',
					UInt('00'),
					UInt(Enc.base64ToHex(jwk.n)),
					UInt(Enc.base64ToHex(jwk.e)),
					UInt(Enc.base64ToHex(jwk.d)),
					UInt(Enc.base64ToHex(jwk.p)),
					UInt(Enc.base64ToHex(jwk.q)),
					UInt(Enc.base64ToHex(jwk.dp)),
					UInt(Enc.base64ToHex(jwk.dq)),
					UInt(Enc.base64ToHex(jwk.qi))
				)
			)
		)
	);
};
X509.packSpkiEc = function(jwk) {
	var x = Enc.base64ToHex(jwk.x);
	var y = Enc.base64ToHex(jwk.y);
	var objId = 'P-256' === jwk.crv ? OBJ_ID_EC : OBJ_ID_EC_384;
	return Enc.hexToBuf(
		Asn1('30', Asn1('30', OBJ_ID_EC_PUB, objId), BitStr('04' + x + y))
	);
};
X509.packSpki = function(jwk) {
	if (/RSA/i.test(jwk.kty)) {
		return X509.packPkcs8Rsa(jwk);
	}
	return X509.packSpkiEc(jwk);
};
X509.packPkix = X509.packSpki;

X509.packCsrRsaPublicKey = function(jwk) {
	// Sequence the key
	var n = UInt(Enc.base64ToHex(jwk.n));
	var e = UInt(Enc.base64ToHex(jwk.e));
	var asn1pub = Asn1('30', n, e);

	// Add the CSR pub key header
	return Asn1(
		'30',
		Asn1('30', Asn1('06', '2a864886f70d010101'), Asn1('05')),
		BitStr(asn1pub)
	);
};

X509.packCsrEcPublicKey = function(jwk) {
	var ecOid = X509._oids[jwk.crv];
	if (!ecOid) {
		throw new Error(
			"Unsupported namedCurve '" +
				jwk.crv +
				"'. Supported types are " +
				Object.keys(X509._oids)
		);
	}
	var cmp = '04'; // 04 == x+y, 02 == x-only
	var hxy = '';
	// Placeholder. I'm not even sure if compression should be supported.
	if (!jwk.y) {
		cmp = '02';
	}
	hxy += Enc.base64ToHex(jwk.x);
	if (jwk.y) {
		hxy += Enc.base64ToHex(jwk.y);
	}

	// 1.2.840.10045.2.1 ecPublicKey
	return Asn1(
		'30',
		Asn1('30', Asn1('06', '2a8648ce3d0201'), Asn1('06', ecOid)),
		BitStr(cmp + hxy)
	);
};

X509._oids = {
	// 1.2.840.10045.3.1.7 prime256v1
	// (ANSI X9.62 named elliptic curve) (06 08 - 2A 86 48 CE 3D 03 01 07)
	'P-256': '2a8648ce3d030107',
	// 1.3.132.0.34 P-384 (06 05 - 2B 81 04 00 22)
	// (SEC 2 recommended EC domain secp256r1)
	'P-384': '2b81040022'
	// 1.3.132.0.35 P-521 (06 05 - 2B 81 04 00 23)
	// (SEC 2 alternate P-521)
	//, 'P-521': '2B 81 04 00 23'
};
}());
