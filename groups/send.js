const request = require('sync-request');
const keys = require('../helpers/keys');
const encrypter = require('../helpers/encrypter');
const constants = require('../helpers/constants');
const logger = require('../helpers/logger');
const transactionFormer = require('../helpers/transactionFormer');
const SAT = 100000000;

module.exports = (hotNode) => {

	return (passPhrase, address, payload, type = 'tokens', isEncode, amount_comment) => {

		const recipientId = address;
		const keyPair = keys.createKeypairFromPassPhrase(passPhrase);

		if (type === 'tokens') {
			try {
				const amount = parseInt(parseFloat(String(payload)) * SAT);
				const data = {
					keyPair,
					recipientId,
					amount
				};
				const transaction = transactionFormer.createTransaction(constants.transactionTypes.SEND, data);
				const res = JSON.parse(request('POST', hotNode() + '/api/transactions/process', {
					json: {
						transaction
					}
				}).getBody().toString());

				return res;

			} catch (e) {
				logger.error('Error while sending tokens: ' + e);
				return false;
			}

		} else if (['message', 'rich', 'signal'].includes(type)) {

			try {
				let message_type = 1;

				if (type === 'rich')
					message_type = 2;
				if (type === 'signal')
					message_type = 3;

				const data = {
					keyPair,
					recipientId,
					message_type
				};

				if (amount_comment) {
					data.amount = parseInt(parseFloat(String(amount_comment)) * SAT);
				}

				const res = request('GET', hotNode() + '/api/accounts/getPublicKey?address=' + recipientId);
				const answer = JSON.parse(res.getBody().toString());

				if (answer.success) {
					const encrypt_data = encrypter.encodeMessage(payload, keyPair, answer.publicKey);

					data.message = encrypt_data.message;
					data.own_message = encrypt_data.own_message;
					const transaction = transactionFormer.createTransaction(constants.transactionTypes.CHAT_MESSAGE, data);

					if (isEncode) {
						return transaction;
					}

					const res = JSON.parse(request('POST', hotNode() + '/api/transactions/process', {
						json: {
							transaction
						}
					}).getBody().toString());

					return res;

				}

			} catch (e) {
				logger.error(`Error while sending message of type ${type}: ${e}`);
				return false;
			}
		}
	};
};
