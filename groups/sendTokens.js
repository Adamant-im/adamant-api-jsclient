const axios = require('axios');
const _ = require('lodash');
const logger = require('../helpers/logger');
const keys = require('../helpers/keys');
const constants = require('../helpers/constants');
const transactionFormer = require('../helpers/transactionFormer');
const validator = require('../helpers/validator');

const DEFAULT_SEND_TOKENS_RETRIES = 4; // How much re-tries for send tokens requests by default. Total 4+1 tries

module.exports = (nodeManager) => {
	return (passPhrase, address, amount, isAmountInADM = true, maxRetries = DEFAULT_SEND_TOKENS_RETRIES, retryNo = 0) => {

    let transaction;

    try {

      if (!validator.validatePassPhrase(passPhrase))
			  return validator.badParameter('passPhrase')
    
      const keyPair = keys.createKeypairFromPassPhrase(passPhrase);

      if (!validator.validateAdmAddress(address))
        return validator.badParameter('address', address)

      if (isAmountInADM) {
        amount = parseInt(parseFloat(String(amount)) * constants.SAT)
      }

      if (!validator.validateIntegerAmount(amount))
        return validator.badParameter('amount', amount)

      const data = {
        keyPair,
        recipientId: address,
        amount
      };

      transaction = transactionFormer.createTransaction(constants.transactionTypes.SEND, data);

    } catch (e) {

      return validator.badParameter('#exception_catched#', e)

    }

    console.log(transaction, transaction)

    const params = {
      json: {
        transaction
      }
    };

    let url = nodeManager.node() + '/api/transactions/process';
    return axios.post(url, { params })
      .then(function (response) {
        console.log('done', response)
        return {
          success: true,
          response: response,
					status: response.status,
					statusText: response.statusText,
					result: response.data
        }
      })
      .catch(function (error) {
        console.log('error', error)
				let logMessage = `[ADAMANT js-api] Send tokens request: Request to ${url} failed with ${error.response ? error.response.status : undefined} status code, ${error.toString()}. Message: ${error.response ? _.trim(error.response.data, '\n') : undefined}. Try ${retryNo+1} of ${maxRetries+1}.`;
				if (retryNo < maxRetries) {
					logger.log(`${logMessage} Retrying…`);
					return nodeManager.changeNodes()
						.then(function () {
							return module.exports(nodeManager)(passPhrase, address, amount, isAmountInADM, maxRetries, ++retryNo)
						})
				}
				logger.warn(`${logMessage} No more attempts, returning error.`);
        return {
          success: false,
          response: error.response,
					status: error.response ? error.response.status : undefined,
					statusText: error.response ? error.response.statusText : undefined,
					error: error.toString(),
					message: error.response ? _.trim(error.response.data, '\n') : undefined
        }
      })

  }
};
