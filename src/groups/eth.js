var Mnemonic = require('bitcore-mnemonic');
const hdkey = require('hdkey');
const HD_KEY_PATH = "m/44'/60'/3'/1/0";
const { bufferToHex, privateToAddress } = require('ethereumjs-util');
const eth = { }

/**
 * Generates a ETH account from the passphrase specified.
 * @param {string} passphrase ADAMANT account passphrase
 * @returns {{address: String, privateKey: Buffer}}
 */

eth.keys = passphrase => {
  const mnemonic = new Mnemonic(passphrase, Mnemonic.Words.ENGLISH);
  const seed = mnemonic.toSeed();
  const privateKey = hdkey.fromMasterSeed(seed).derive(HD_KEY_PATH)._privateKey;

  return {
    address: bufferToHex(privateToAddress(privateKey)),
    privateKey: bufferToHex(privateKey)
  };
};

module.exports = eth;
