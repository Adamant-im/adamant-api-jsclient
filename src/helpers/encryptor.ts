import sodium from 'sodium-browserify-tweetnacl';
import nacl from 'tweetnacl';
import ed2curve from 'ed2curve';
import {KeyPair, createKeypairFromPassphrase} from './keys';

export const bytesToHex = (bytes: Uint8Array) => {
  let hex = '';

  for (const byte of bytes) {
    hex += (byte >>> 4).toString(16);
    hex += (byte & 0xf).toString(16);
  }

  return hex;
};

export const hexToBytes = (hex: string) => {
  const bytes: number[] = [];

  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.slice(c, c + 2), 16));
  }

  return Uint8Array.from(bytes);
};

export const utf8ArrayToStr = (array: Uint8Array) => {
  const len = array.length;
  let out = '';
  let i = 0;
  let c: number;
  let char2: number;
  let char3: number;

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
        out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(
          ((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0)
        );
        break;
    }
  }

  return out;
};

export const encodeMessage = (
  msg: string,
  keypair: KeyPair,
  recipientPublicKey: string
) => {
  const nonce = Buffer.allocUnsafe(24);
  sodium.randombytes(nonce);

  const plainText = Buffer.from(msg.toString());
  const DHSecretKey = ed2curve.convertSecretKey(keypair.privateKey);
  const DHPublicKey = ed2curve.convertPublicKey(
    new Uint8Array(hexToBytes(recipientPublicKey))
  );

  if (!DHPublicKey) {
    throw new Error('encodeMessage: invalid key');
  }

  const encrypted = nacl.box(plainText, nonce, DHPublicKey, DHSecretKey);

  return {
    message: bytesToHex(encrypted),
    own_message: bytesToHex(nonce),
  };
};

export const decodeMessage = (
  message: string,
  senderPublicKey: string,
  passphrase: string,
  nonce: string
) => {
  const keypair = createKeypairFromPassphrase(passphrase);

  if (typeof message !== 'string') {
    throw new Error('decodeMessage message should be a string');
  }

  if (typeof nonce !== 'string') {
    throw new Error('decodeMessage: nonce should be a string');
  }

  if (typeof senderPublicKey !== 'string') {
    throw new Error('decodeMessage: senderPublicKey should be a string');
  }

  const DHPublicKey = ed2curve.convertPublicKey(hexToBytes(senderPublicKey));

  if (!DHPublicKey) {
    throw new Error('decodeMessage: invalid key');
  }

  const {privateKey} = keypair;
  const DHSecretKey = ed2curve.convertSecretKey(privateKey);

  const decrypted = nacl.box.open(
    hexToBytes(message),
    hexToBytes(nonce),
    DHPublicKey,
    DHSecretKey
  );

  return decrypted ? utf8ArrayToStr(decrypted) : '';
};
