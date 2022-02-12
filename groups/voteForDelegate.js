const axios = require('axios');
const get = require('./get');
const logger = require('../helpers/logger');
const keys = require('../helpers/keys');
const constants = require('../helpers/constants');
const transactionFormer = require('../helpers/transactionFormer');
const validator = require('../helpers/validator');

const DEFAULT_VOTE_FOR_DELEGATE_RETRIES = 4; // How much re-tries for send tokens requests by default. Total 4+1 tries

const publicKeysCache = { };

module.exports = (nodeManager) => {
  /**
		* Creates votes for delegate transaction, signs it, and broadcasts to ADAMANT network
    * See https://github.com/Adamant-im/adamant/wiki/Transaction-Types#type-3-vote-for-delegate-transaction
    * @param {string} passPhrase Senders's passPhrase. Sender's address will be derived from it.
    * @param {string[]} votes PublicKeys, ADM addresses and delegate names for upvote and downvote
    * @param {number} maxRetries How much times to retry request
    * @returns {Promise} Request results
  	*/
	return async (passPhrase, votes, maxRetries = DEFAULT_VOTE_FOR_DELEGATE_RETRIES, retryNo = 0) => {

    let transaction;

    try {
      if (!validator.validatePassPhrase(passPhrase))
			  return validator.badParameter('passPhrase');

      const keyPair = keys.createKeypairFromPassPhrase(passPhrase);

      const uniqueVotes = [];

      for (let i = votes.length - 1; i >= 0; i--) {
        const vote = votes[i];
        const voteName = vote.slice(1);
        const voteDirection = vote.charAt(0);

        const cachedPublicKey = publicKeysCache[voteName];

        if (cachedPublicKey) {
          votes[i] = `${voteDirection}${cachedPublicKey}`;
          continue;
        }

        if (validator.validateAdmVoteForAddress(vote)) {
          const res = await get(nodeManager)('/accounts', { address: voteName });

          if (res.success) {
            const publicKey = res.data.account.publicKey;
            votes[i] = `${voteDirection}${publicKey}`;
            publicKeysCache[voteName] = publicKey;
          } else {
            logger.warn(`[ADAMANT js-api] Failed to get public key for ${vote}. ${res.errorMessage}.`);
            return validator.badParameter('votes')
          }
        } else if (validator.validateAdmVoteForDelegateName(vote)) {
			    const res = await get(nodeManager)('/delegates/get', { username: voteName });

          if (res.success) {
            const publicKey = res.data.delegate.publicKey;
            votes[i] = `${voteDirection}${publicKey}`;
            publicKeysCache[voteName] = publicKey;
          } else {
            logger.warn(`[ADAMANT js-api] Failed to get public key for ${vote}. ${res.errorMessage}.`);
            return validator.badParameter('votes')
          }
        } else if (!validator.validateAdmVoteForPublicKey(vote)) {
			    return validator.badParameter('votes')
        }

        // Exclude duplicates
        const foundCopy = uniqueVotes.findIndex((v) => v.slice(1) === votes[i].slice(1));

        if (foundCopy === -1) {
          uniqueVotes.push(votes[i]);
        }
      }

      const type = constants.transactionTypes.VOTE;

      const data = {
        type,
        keyPair,
        votes: uniqueVotes,
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
