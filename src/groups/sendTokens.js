const axios = require('../helpers/axiosClient');
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
  return (passPhrase, addressOrPublicKey, amount, isAmountInADM = true, maxRetries = DEFAULT_SEND_TOKENS_RETRIES, retryNo = 0) => {

    let transaction;
    let address, publicKey;

    try {

      if (!validator.validatePassPhrase(passPhrase))
        return validator.badParameter('passPhrase')

      const keyPair = keys.createKeypairFromPassPhrase(passPhrase);

      if (!validator.validateAdmAddress(addressOrPublicKey)) {
        if (!validator.validateAdmPublicKey(addressOrPublicKey)) {
          return validator.badParameter('addressOrPublicKey', addressOrPublicKey)
        } else {
          publicKey = addressOrPublicKey;
          try {
            address = keys.createAddressFromPublicKey(publicKey)
          } catch (e) {
            return validator.badParameter('addressOrPublicKey', addressOrPublicKey)
          }
        }
      } else {
        publicKey = '';
        address = addressOrPublicKey
      }

      if (isAmountInADM) {
        amountInSat = validator.AdmToSats(amount)
      } else {
        amountInSat = amount
      }

      if (!validator.validateIntegerAmount(amountInSat))
        return validator.badParameter('amount', amount)

      const data = {
        keyPair,
        recipientId: address,
        amount: amountInSat
      };

      transaction = transactionFormer.createTransaction(constants.transactionTypes.SEND, data);

    } catch (e) {

      return validator.badParameter('#exception_catched#', e)

    }

    let url = nodeManager.node() + '/api/transactions/process';
    return axios.post(url, { transaction })
      .then(function (response) {
        return validator.formatRequestResults(response, true)
      })
      .catch(function (error) {
        let logMessage = `[ADAMANT js-api] Send tokens request: Request to ${url} failed with ${error.response ? error.response.status : undefined} status code, ${error.toString()}${error.response && error.response.data ? '. Message: ' + error.response.data.toString().trim() : ''}. Try ${retryNo + 1} of ${maxRetries + 1}.`;
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
