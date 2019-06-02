const ed2curve = require('ed2curve');
const nacl = require('tweetnacl/nacl-fast');
const keys = require('../helpers/keys');

module.exports = (msg, senderPublicKey, passPhrase, nonce) => {
	const keypair = keys.createKeypairFromPassPhrase(passPhrase);
	let privateKey = keypair.privateKey;
	if (typeof msg === 'string') {
		msg = hexToBytes(msg)
	}
	if (typeof nonce === 'string') {
		nonce = hexToBytes(nonce)
	}

	if (typeof senderPublicKey === 'string') {
		senderPublicKey = hexToBytes(senderPublicKey)
	}

	if (typeof privateKey === 'string') {
		privateKey = hexToBytes(privateKey)
	}
	const DHPublicKey = ed2curve.convertPublicKey(senderPublicKey);
	const DHSecretKey = ed2curve.convertSecretKey(privateKey);
	const decrypted = nacl.box.open(msg, nonce, DHPublicKey, DHSecretKey);
	return decrypted ? Utf8ArrayToStr(decrypted) : ''
}


function hexToBytes(hexString = '') {
	const bytes = []

	for (let c = 0; c < hexString.length; c += 2) {
		bytes.push(parseInt(hexString.substr(c, 2), 16))
	}

	return Uint8Array.from(bytes);
}

function Utf8ArrayToStr(array) {
	var out, i, len, c;
	var char2, char3;

	out = "";
	len = array.length;
	i = 0;
	while (i < len) {
		c = array[i++];
		switch (c >> 4) {
			case 0:
			case 1:
			case 2:
			case 3:
			case 4:
			case 5:
			case 6:
			case 7:
				// 0xxxxxxx
				out += String.fromCharCode(c);
				break;
			case 12:
			case 13:
				// 110x xxxx   10xx xxxx
				char2 = array[i++];
				out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
				break;
			case 14:
				// 1110 xxxx  10xx xxxx  10xx xxxx
				char2 = array[i++];
				char3 = array[i++];
				out += String.fromCharCode(((c & 0x0F) << 12) |
					((char2 & 0x3F) << 6) |
					((char3 & 0x3F) << 0));
				break;
		}
	}

	return out;
}