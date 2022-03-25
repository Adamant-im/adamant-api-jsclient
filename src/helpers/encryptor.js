const sodium = require('sodium-browserify-tweetnacl');
const nacl = require('tweetnacl/nacl-fast');
const ed2curve = require('ed2curve');

module.exports = {

  bytesToHex: function(bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
      hex.push((bytes[i] >>> 4).toString(16));
      hex.push((bytes[i] & 0xF).toString(16));
    }
    return hex.join('');
  },

  hexToBytes: function(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2) {
      bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
  },

  encodeMessage: function(msg, keypair, recipientPublicKey) {
    const nonce = Buffer.allocUnsafe(24);
    sodium.randombytes(nonce);
    const plainText = Buffer.from(msg.toString());
    const DHPublicKey = ed2curve.convertPublicKey(new Uint8Array(this.hexToBytes(recipientPublicKey)));
    const DHSecretKey = ed2curve.convertSecretKey(keypair.privateKey);
    const encrypted = nacl.box(plainText, nonce, DHPublicKey, DHSecretKey);
    return {
      message: this.bytesToHex(encrypted),
      own_message: this.bytesToHex(nonce),
    };
  },

};
