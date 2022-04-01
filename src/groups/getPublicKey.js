const get = require('./get');
const logger = require('../helpers/logger');
const publicKeysCache = { };

module.exports = (nodeManager) => {
  return async (address) => {
    if (publicKeysCache[address]) {
      return publicKeysCache[address];
    }

    const publicKey = await get(nodeManager)('/accounts/getPublicKey', {address});
    if (publicKey.success) {
      publicKeysCache[address] = publicKey.data.publicKey;
      return publicKey.data.publicKey;
    } else {
      logger.warn(`[ADAMANT js-api] Failed to get public key for ${address}. ${publicKey.errorMessage}.`);
      return false;
    }
  };
};
