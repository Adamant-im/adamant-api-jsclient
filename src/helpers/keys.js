const sodium = require('sodium-browserify-tweetnacl');
const crypto = require('crypto');
const bip39 = require('bip39');

const bignum = require('./bignumber.js');

module.exports = {
  createNewPassPhrase() {
    return bip39.generateMnemonic();
  },
  makeKeypairFromHash(hash) {
    const keypair = sodium.crypto_sign_seed_keypair(hash);

    return {
      publicKey: keypair.publicKey,
      privateKey: keypair.secretKey,
    };
  },
  createHashFromPassPhrase(passPhrase) {
    return crypto
        .createHash('sha256')
        .update(
            bip39.mnemonicToSeedSync(passPhrase).toString('hex'),
            'hex',
        )
        .digest();
  },
  createKeypairFromPassPhrase(passPhrase) {
    const hash = this.createHashFromPassPhrase(passPhrase);

    return this.makeKeypairFromHash(hash);
  },
  createAddressFromPublicKey(publicKey) {
    const publicKeyHash = crypto
        .createHash('sha256')
        .update(publicKey, 'hex')
        .digest();

    const temp = Buffer.alloc(8);

    for (let i = 0; i < 8; i++) {
      temp[i] = publicKeyHash[7 - i];
    }

    return `U${bignum.fromBuffer(temp)}`;
  },
};
