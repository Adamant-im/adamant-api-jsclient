const get = require('./get');
const logger = require('../helpers/logger');

module.exports = (nodeManager) => {

  return async (address) => {

      const publicKey = await get(nodeManager)('/accounts/getPublicKey', { address });  
      if (publicKey.success) {
        return publicKey.data.publicKey
      } else {
        logger.warn(`[ADAMANT js-api] Failed to get public key for ${address}. ${publicKey.errorMessage}.`);
        return false
      }

  }

};
