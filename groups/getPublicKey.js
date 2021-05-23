const get = require('./get');
const logger = require('../helpers/logger');

module.exports = (nodeManager) => {

  return async (address) => {

    try {

      const publicKey = await get(nodeManager)('/accounts/getPublicKey', { address });
      if (publicKey.success) {
        if (publicKey.result.success) {
          return publicKey.result.publicKey
        } else {
          logger.warn(`Unable to get public key for ${address}. Node's reply: ${publicKey.result.error}.`);
          return false
        }
      } else {
        logger.warn(`Failed to get public key for ${address}, ${publicKey.error}. Message: ${publicKey.message}.`);
        return false
      }

    } catch (e) {
      logger.error(`Error while fetching public key for ${address}:`, e);
      return false
    }

  }

};
