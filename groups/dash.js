var bitcoin = require('bitcoinjs-lib');
var coinNetworks = require('./coinNetworks');
const dash = { }

/**
 * Generates a DASH account from the passphrase specified.
 * @param {string} passphrase ADAMANT account passphrase
 * @returns {{address: String, privateKey: Buffer}}
 */

dash.keys = passphrase => {
  const network = coinNetworks.DASH;
  const pwHash = bitcoin.crypto.sha256(Buffer.from(passphrase));
  const keyPair = bitcoin.ECPair.fromPrivateKey(pwHash, { network });
  const asWif = false; // DASH private key is not of Wallet Import Format
  const privateKey = asWif
    ? keyPair.toWIF()
    : keyPair.privateKey.toString('hex')

  return {
    network,
    keyPair,
    address: bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network }).address,
    privateKey,
    privateKeyWIF: keyPair.toWIF()
  }

};

module.exports = dash;
