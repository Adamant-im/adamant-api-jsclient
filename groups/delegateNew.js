const axios = require('axios');
const logger = require('../helpers/logger');
const keys = require('../helpers/keys');
const constants = require('../helpers/constants');
const transactionFormer = require('../helpers/transactionFormer');
const validator = require('../helpers/validator');

const DEFAULT_SEND_TOKENS_RETRIES = 4; // How much re-tries for send tokens requests by default. Total 4+1 tries

module.exports = (nodeManager) => {
  /**
		* Creates Token Transfer transaction, signs it, and broadcasts to ADAMANT network
    * See https://github.com/Adamant-im/adamant/wiki/Transaction-Types#type-0-token-transfer-transaction
    * @param {string} passPhrase Senders's passPhrase. Sender's address will be derived from it.
    * @param {string} addressOrPublicKey Recipient's ADAMANT address or public key.
    * Address is preferred, as if we get public key, we should derive address from it.
    * @param {string, number} amount Amount to send
    * @param {boolean} isAmountInADM If amount specified in ADM, or in sats (10^-8 ADM)
    * @param {number} maxRetries How much times to retry request
    * @returns {Promise} Request results
  	*/
	return (passPhrase, username, maxRetries = DEFAULT_SEND_TOKENS_RETRIES, retryNo = 0) => {

    let transaction;

    try {
      if (!validator.validatePassPhrase(passPhrase))
			  return validator.badParameter('passPhrase')

      const keyPair = keys.createKeypairFromPassPhrase(passPhrase);

      if (!validator.validateDelegateName(username))
			  return validator.badParameter('username')

      const type = constants.transactionTypes.DELEGATE;

      const data = {
        type,
        keyPair,
        username,
      };

      transaction = transactionFormer.createTransaction(type, data);

    } catch (e) {

      return validator.badParameter('#exception_catched#', e)

    }

    let url = nodeManager.node() + '/api/delegates';
    return axios.post(url, transaction)
      .then(function (response) {
        return validator.formatRequestResults(response, true)
      })
      .catch(function (error) {
				let logMessage = `[ADAMANT js-api] New delegate request: Request to ${url} failed with ${error.response ? error.response.status : undefined} status code, ${error.toString()}${error.response && error.response.data ? '. Message: ' + error.response.data.toString().trim() : ''}. Try ${retryNo+1} of ${maxRetries+1}.`;
				if (retryNo < maxRetries) {
					logger.log(`${logMessage} Retrying…`);
					return nodeManager.changeNodes()
						.then(function () {
							return module.exports(nodeManager)(passPhrase, addressOrPublicKey, amount, isAmountInADM, maxRetries, ++retryNo)
						})
				}
				logger.warn(`${logMessage} No more attempts, returning error.`);
        return validator.formatRequestResults(error, false)
      })

  }
};
