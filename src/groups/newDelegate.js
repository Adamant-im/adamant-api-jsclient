const axios = require('../helpers/axiosClient');
const logger = require('../helpers/logger');
const keys = require('../helpers/keys');
const constants = require('../helpers/constants');
const transactionFormer = require('../helpers/transactionFormer');
const validator = require('../helpers/validator');

const DEFAULT_NEW_DELEGATE_RETRIES = 4; // How much re-tries for send tokens requests by default. Total 4+1 tries

module.exports = (nodeManager) => {
  /**
		* Registers user account as delegate
    * @param {string} passPhrase Senders's passPhrase. Sender's address will be derived from it.
    * @param {string} username Delegate name you want to register with.
    * It must be unique in ADAMANT blockchain. It should not be similar to ADAMANT address.
    * Delegate name can only contain alphanumeric characters and symbols !@$&_.
    * @param {number} maxRetries How much times to retry request
    * @returns {Promise} Request results
  	*/
	return async (passPhrase, username, maxRetries = DEFAULT_NEW_DELEGATE_RETRIES, retryNo = 0) => {

    let transaction;

    try {
      if (!validator.validatePassPhrase(passPhrase)) {
			  return validator.badParameter('passPhrase');
      }

      const keyPair = keys.createKeypairFromPassPhrase(passPhrase);

      if (!validator.validateDelegateName(username)) {
			  return validator.badParameter('username');
      }

      const type = constants.transactionTypes.DELEGATE;

      const data = {
        type,
        keyPair,
        username,
      };

      transaction = transactionFormer.createTransaction(type, data);

    } catch (e) {
      return validator.badParameter('#exception_catched#', e);
    }

    const url = nodeManager.node() + '/api/delegates';

    try {
      const response = await axios.post(url, transaction);

      return validator.formatRequestResults(response, true);
    } catch (error) {
      const logMessage = `[ADAMANT js-api] New delegate request: Request to ${url} failed with ${error.response ? error.response.status : undefined} status code, ${error.toString()}${error.response && error.response.data ? '. Message: ' + error.response.data.toString().trim() : ''}. Try ${retryNo+1} of ${maxRetries+1}.`;

      if (retryNo < maxRetries) {
        logger.log(`${logMessage} Retrying…`);

        return nodeManager.changeNodes()
          .then(() => (
            module.exports(nodeManager)(passPhrase, addressOrPublicKey, amount, isAmountInADM, maxRetries, ++retryNo)
          ));
      }

      logger.warn(`${logMessage} No more attempts, returning error.`);

      return validator.formatRequestResults(error, false);
    }
  }
};
