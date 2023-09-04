const {mnemonicToSeedSync} = require('bip39');
const hdkey = require('hdkey');
const {bufferToHex, privateToAddress} = require('ethereumjs-util');

const HD_KEY_PATH = 'm/44\'/60\'/3\'/1/0';

const eth = {};

/**
 * Generates a ETH account from the passphrase specified.
 * @param {string} passphrase ADAMANT account passphrase
 * @return {{address: String, privateKey: Buffer}}
 */
eth.keys = (passphrase) => {
  const seed = mnemonicToSeedSync(passphrase);
  const privateKey = hdkey.fromMasterSeed(seed).derive(HD_KEY_PATH)._privateKey;

  return {
    address: bufferToHex(privateToAddress(privateKey)),
    privateKey: bufferToHex(privateKey),
  };
};

module.exports = eth;
