const axios = require('axios');
const logger = require('../helpers/logger');
const keys = require('../helpers/keys');
const constants = require('../helpers/constants');
const encryptor = require('../helpers/encryptor');
const transactionFormer = require('../helpers/transactionFormer');
const validator = require('../helpers/validator');
const getPublicKey = require('./getPublicKey');

const DEFAULT_SEND_MESSAGE_RETRIES = 4; // How much re-tries for send message requests by default. Total 4+1 tries

module.exports = (nodeManager) => {
  /**
		* Encrypts a message, creates Message transaction, signs it, and broadcasts to ADAMANT network. Supports Basic, Rich and Signal Message Types.
    * See https://github.com/Adamant-im/adamant/wiki/Message-Types
    * @param {string} passPhrase Senders's passPhrase. Sender's address will be derived from it.
    * @param {string} addressOrPublicKey Recipient's ADAMANT address or public key.
    * Using public key is faster, as the library wouldn't request it from the network.
    * Though we cache public keys, and next request with address will be processed as fast as with public key.
    * @param {string} message Message plain text in case of basic message. Stringified JSON in case of rich or signal messages. The library will encrypt a message.
    * Example of rich message for Ether in-chat transfer: `{"type":"eth_transaction","amount":"0.002","hash":"0xfa46d2b3c99878f1f9863fcbdb0bc27d220d7065c6528543cbb83ced84487deb","comments":"I like to send it, send it"}`
    * @param {string, number} message_type Type of message: basic, rich, or signal
    * @param {string, number} amount Amount to send with a message
    * @param {boolean} isAmountInADM If amount specified in ADM, or in sats (10^-8 ADM)
    * @param {number} maxRetries How much times to retry request
    * @returns {Promise} Request results
  	*/
	return async (passPhrase, addressOrPublicKey, message, message_type = 'basic', amount, isAmountInADM = true, maxRetries = DEFAULT_SEND_MESSAGE_RETRIES, retryNo = 0) => {

    let keyPair, data;
    let address, publicKey;

    try {

      if (!validator.validatePassPhrase(passPhrase))
			  return validator.badParameter('passPhrase')
    
      keyPair = keys.createKeypairFromPassPhrase(passPhrase);

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

      if (message_type === 'basic')
        message_type = 1;
      if (message_type === 'rich')
        message_type = 2;
      if (message_type === 'signal')
        message_type = 3;
        
      if (!validator.validateMessageType(message_type))
        return validator.badParameter('message_type', message_type)

      let messageValidation = validator.validateMessage(message, message_type);
      if (!messageValidation.result)
        return validator.badParameter('message', message, messageValidation.error)

      data = {
        keyPair,
        recipientId: address,
        message_type
      };
  
      if (amount) {
        if (isAmountInADM) {
          amountInSat = validator.AdmToSats(amount)
        } else {
          amountInSat = amount
        }  
        if (!validator.validateIntegerAmount(amountInSat))
          return validator.badParameter('amount', amount)
        data.amount = amountInSat;
      }

    } catch (e) {

      return validator.badParameter('#exception_catched#', e)

    }

    if (!publicKey)
      publicKey = await getPublicKey(nodeManager)(address);

    if (!publicKey)
      return new Promise((resolve, reject) => {
        resolve({
          success: false,
          errorMessage: `Unable to get public key for ${addressOrPublicKey}. It is necessary for sending an encrypted message. Account may be uninitialized (https://medium.com/adamant-im/chats-and-uninitialized-accounts-in-adamant-5035438e2fcd), or network error`
        })
      })

    try {

      const encryptedMessage = encryptor.encodeMessage(message, keyPair, publicKey);
      data.message = encryptedMessage.message;
      data.own_message = encryptedMessage.own_message;

      let transaction = transactionFormer.createTransaction(constants.transactionTypes.CHAT_MESSAGE, data);

      let url = nodeManager.node() + '/api/transactions/process';
      return axios.post(url, { transaction })
        .then(function (response) {
          return validator.formatRequestResults(response, true)
        })
        .catch(function (error) {
          let logMessage = `[ADAMANT js-api] Send message request: Request to ${url} failed with ${error.response ? error.response.status : undefined} status code, ${error.toString()}${error.response && error.response.data ? '. Message: ' + error.response.data.toString().trim() : ''}. Try ${retryNo+1} of ${maxRetries+1}.`;
          if (retryNo < maxRetries) {
            logger.log(`${logMessage} Retrying…`);
            return nodeManager.changeNodes()
              .then(function () {
                return module.exports(nodeManager)(passPhrase, addressOrPublicKey, message, message_type, tokensAmount, maxRetries, ++retryNo)
              })
          }
          logger.warn(`${logMessage} No more attempts, returning error.`);
          return validator.formatRequestResults(error, false)
        })
        
    } catch (e) {

      return new Promise((resolve, reject) => {
        resolve({
          success: false,
          errorMessage: `Unable to encode message '${message}' with public key ${publicKey}, or unable to build a transaction. Exception: ` + e
        })
      })

    }

  } // sendMessage()

};
