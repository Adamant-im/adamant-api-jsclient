const sendMessage = require('./sendMessage');
const { DEFAULT_SEND_MESSAGE_RETRIES } = require('./../helpers/constants');
const log = require('./../helpers/logger');

module.exports = (nodeManager) => {
  const sendMsg = sendMessage(nodeManager);

  return async (passPhrase, addressOrPublicKey, message, messageType = 'basic', amount, isAmountInADM = true, maxRetries = DEFAULT_SEND_MESSAGE_RETRIES, retryNo = 0) => {
    return sendMsg(passPhrase, addressOrPublicKey, messageType, amount, isAmountInADM, maxRetries, retryNo).then((response) => {
      if (!response.success) {
        log.warn(`Failed to send ADM message '${message}' to ${addressOrPublicKey}. ${response.errorMessage}.`);
      }
      return response;
    });
  }
}
