const axios = require('axios');
const _ = require('lodash');
const logger = require('../helpers/logger');
const keys = require('../helpers/keys');
const constants = require('../helpers/constants');
const encryptor = require('../helpers/encryptor');
const transactionFormer = require('../helpers/transactionFormer');
const validator = require('../helpers/validator');
const getPublicKey = require('./getPublicKey');

const DEFAULT_SEND_MESSAGE_RETRIES = 4; // How much re-tries for send message requests by default. Total 4+1 tries

module.exports = (nodeManager) => {
	return (passPhrase, address, message, message_type = 1, tokensAmount, maxRetries = DEFAULT_SEND_MESSAGE_RETRIES, retryNo = 0) => {

    let keyPair, data;

    try {

      if (!validator.validatePassPhrase(passPhrase))
			  return validator.badParameter('passPhrase')
    
      keyPair = keys.createKeypairFromPassPhrase(passPhrase);

      if (!validator.validateAdmAddress(address))
        return validator.badParameter('address', address)

      if (message_type === 'rich')
        message_type = 2;
      if (message_type === 'signal')
        message_type = 3;
        
      if (!validator.validateMessageType(message_type))
        return validator.badParameter('message_type', message_type)

      if (!validator.validateMessage(message))
        return validator.badParameter('message', message)

      data = {
        keyPair,
        recipientId: address,
        message_type
      };
  
      if (tokensAmount) {
        tokensAmount = tokensAmount.toString();
        if (!validator.validateStringAmount(tokensAmount))
          return validator.badParameter('tokensAmount', tokensAmount)
        data.amount = tokensAmount;
      }

    } catch (e) {

      return validator.badParameter('#exception_catched#', e)

    }

    return getPublicKey(nodeManager)(address)
      .then((publicKey) => {

        if (publicKey) {

          try {

            const encryptedMessage = encryptor.encodeMessage(message, keyPair, publicKey);
            console.log(encryptedMessage)
            data.message = encryptedMessage.message;
            data.own_message = encryptedMessage.own_message;

            let transaction = transactionFormer.createTransaction(constants.transactionTypes.CHAT_MESSAGE, data);

            let url = nodeManager.node() + '/api/transactions/process';
            return axios.post(url, { transaction })
              .then(function (response) {
                return {
                  success: true,
                  response: response,
                  status: response.status,
                  statusText: response.statusText,
                  result: response.data
                }
              })
              .catch(function (error) {
                let logMessage = `[ADAMANT js-api] Send message request: Request to ${url} failed with ${error.response ? error.response.status : undefined} status code, ${error.toString()}. Message: ${error.response ? _.trim(error.response.data, '\n') : undefined}. Try ${retryNo+1} of ${maxRetries+1}.`;
                if (retryNo < maxRetries) {
                  logger.log(`${logMessage} Retrying…`);
                  return nodeManager.changeNodes()
                    .then(function () {
                      return module.exports(nodeManager)(passPhrase, address, message, message_type, tokensAmount, maxRetries, ++retryNo)
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
              
          } catch (e) {

            return new Promise((resolve, reject) => {
              resolve({
                success: false,
                error: 'Failed to process a message',
                message: `Unable to encode message '${message}' with public key ${publicKey}, or unable to build a transaction. Exception: ` + e
              })
            })

          }

        } else {

          return new Promise((resolve, reject) => {
            resolve({
              success: false,
              error: 'No public key',
              message: `Unable to get public key for ${address}. It is necessary for sending an encrypted message. Account may be uninitialized (https://medium.com/adamant-im/chats-and-uninitialized-accounts-in-adamant-5035438e2fcd), or network error`
            })
          })

        } // if (publicKey)

      }) // getPublicKey.then
  }

};
