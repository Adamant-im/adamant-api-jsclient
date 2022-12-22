const bitcoin = require('bitcoinjs-lib');
const {ECPairFactory} = require('ecpair');
const tinysecp = require('tiny-secp256k1');

const coinNetworks = require('./coinNetworks');
const doge = {};

/**
 * Generates a DOGE account from the passphrase specified.
 * @param {string} passphrase ADAMANT account passphrase
 * @return {object} network info, keyPair, privateKey, privateKeyWIF
 */
doge.keys = (passphrase) => {
  const network = coinNetworks.DOGE;
  const pwHash = bitcoin.crypto.sha256(Buffer.from(passphrase));

  const ECPairAPI = new ECPairFactory(tinysecp);
  const keyPair = ECPairAPI.fromPrivateKey(pwHash, {network});

  return {
    network,
    keyPair,
    address: bitcoin.payments.p2pkh({pubkey: keyPair.publicKey, network}).address,
    // DOGE private key is a regular 256-bit key
    privateKey: keyPair.privateKey.toString('hex'), // regular 256-bit (32 bytes, 64 characters) private key
    privateKeyWIF: keyPair.toWIF(), // Wallet Import Format (52 base58 characters)
  };
};

module.exports = doge;
