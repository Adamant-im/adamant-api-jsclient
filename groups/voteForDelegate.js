const axios = require('axios');
const logger = require('../helpers/logger');
const keys = require('../helpers/keys');
const constants = require('../helpers/constants');
const transactionFormer = require('../helpers/transactionFormer');
const validator = require('../helpers/validator');

const DEFAULT_VOTE_FOR_DELEGATE_RETRIES = 4; // How much re-tries for send tokens requests by default. Total 4+1 tries

module.exports = (nodeManager) => {
  /**
		* Creates votes for delegate transaction, signs it, and broadcasts to ADAMANT network
    * See https://github.com/Adamant-im/adamant/wiki/Transaction-Types#type-3-vote-for-delegate-transaction
    * @param {string} passPhrase Senders's passPhrase. Sender's address will be derived from it.
    * @param {string[]} votes PublicKeys for upvote and downvote
    * @param {number} maxRetries How much times to retry request
    * @returns {Promise} Request results
  	*/
	return (passPhrase, votes, maxRetries = DEFAULT_VOTE_FOR_DELEGATE_RETRIES, retryNo = 0) => {

    let transaction;

    try {
      if (!validator.validatePassPhrase(passPhrase))
			  return validator.badParameter('passPhrase')

      const keyPair = keys.createKeypairFromPassPhrase(passPhrase);

      if (!validator.validateAdmVotes(votes))
			  return validator.badParameter('votes')

      const type = constants.transactionTypes.VOTE;

      const data = {
        type,
        keyPair,
        votes,
      };

      transaction = transactionFormer.createTransaction(type, data);

    } catch (e) {

      return validator.badParameter('#exception_catched#', e)

    }

    let url = nodeManager.node() + '/api/accounts/delegates';
    return axios.post(url, transaction)
      .then(function (response) {
        return validator.formatRequestResults(response, true)
      })
      .catch(function (error) {
				let logMessage = `[ADAMANT js-api] Vote for delegate request: Request to ${url} failed with ${error.response ? error.response.status : undefined} status code, ${error.toString()}${error.response && error.response.data ? '. Message: ' + error.response.data.toString().trim() : ''}. Try ${retryNo+1} of ${maxRetries+1}.`;
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
