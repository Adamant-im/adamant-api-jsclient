const get = require('./get');
const logger = require('../helpers/logger');

module.exports = (nodeManager) => {

  return (address) => {

    try {

      const publicKey = await get(nodeManager)('/accounts/getPublicKey', { address });
      if (publicKey.success) {
        if (publicKey.result.success) {
          console.log('publicKey.result', publicKey.result)
          // return votesCount
        } else {
          logger.warn(`Unable to get public key for ${address}. Node's reply: ${publicKey.result.error}.`);
        }
      } else {
        logger.warn(`Failed to get public key for ${address}, ${publicKey.error}. Message: ${publicKey.message}.`);
      }

    } catch (e) {
      logger.error(`Error while fetching public key for ${address}:`, e);
    }

  }

};
