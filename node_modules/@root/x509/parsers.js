'use strict';

var X509 = module.exports;
var Enc = require('@root/encoding');
var ASN1 = require('@root/asn1/parser');

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
