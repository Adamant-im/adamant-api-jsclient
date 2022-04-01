const bitcoin = require('bitcoinjs-lib');
const coinNetworks = require('./coinNetworks');
const dash = { };

/**
 * Generates a DASH account from the passphrase specified.
 * @param {string} passphrase ADAMANT account passphrase
 * @returns {object} network info, keyPair, privateKey, privateKeyWIF
 */

dash.keys = (passphrase) => {
  const network = coinNetworks.DASH;
  const pwHash = bitcoin.crypto.sha256(Buffer.from(passphrase));
  const keyPair = bitcoin.ECPair.fromPrivateKey(pwHash, {network});

  return {
    network,
    keyPair,
    address: bitcoin.payments.p2pkh({pubkey: keyPair.publicKey, network}).address,
    // DASH private key is a regular 256-bit key
    privateKey: keyPair.privateKey.toString('hex'), // regular 256-bit (32 bytes, 64 characters) private key
    privateKeyWIF: keyPair.toWIF(), // Wallet Import Format (52 base58 characters)
  };
};

module.exports = dash;
