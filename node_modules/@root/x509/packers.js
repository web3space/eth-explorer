'use strict';

var X509 = module.exports;

// 1.2.840.10045.3.1.7
// prime256v1 (ANSI X9.62 named elliptic curve)
var OBJ_ID_EC = '06 08 2A8648CE3D030107'.replace(/\s+/g, '').toLowerCase();
// 1.3.132.0.34
// secp384r1 (SECG (Certicom) named elliptic curve)
var OBJ_ID_EC_384 = '06 05 2B81040022'.replace(/\s+/g, '').toLowerCase();
// 1.2.840.10045.2.1
// ecPublicKey (ANSI X9.62 public key type)
var OBJ_ID_EC_PUB = '06 07 2A8648CE3D0201'.replace(/\s+/g, '').toLowerCase();

var Enc = require('@root/encoding');
var ASN1 = require('@root/asn1/packer');
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
	// requires more logic and isn't a recommended standard
	// 1.3.132.0.35 P-521 (06 05 - 2B 81 04 00 23)
	// (SEC 2 alternate P-521)
	//, 'P-521': '2B 81 04 00 23'
};
