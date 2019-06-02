const request = require('sync-request');
const log = require('../helpers/log');
const keys = require('../helpers/keys');
const encrypter = require('../helpers/encrypter');
const constants = require('../helpers/constants');
const transactionFormer = require('../helpers/transactionFormer');

module.exports = (hotNode) => {
	return (passPhrase, address, payload, type = 'tokens', isEncode) => {
		const recipient_name = address
		const keypair = keys.createKeypairFromPassPhrase(passPhrase);

		if (type === 'tokens') {
			try {
				const amount = parseInt(parseFloat(String(payload)) * 100000000);
				const data = {
					keyPair: keypair,
					recipientId: recipient_name,
					amount: amount
				}
				const transaction = transactionFormer.createTransaction(constants.transactionTypes.SEND, data)
				const res = JSON.parse(request('POST', hotNode() + '/api/transactions/process', {
					json: {
						transaction
					}
				}).getBody().toString());

				return res;

			} catch (e) {
				log.error(' Send tokens: ' + e);
				return false;
			}
		} else if (type === 'message' || type === 'rich' || type === 'signal') {
			try {
				const message = payload
				const message_type = 1
				if (type === 'rich')
					message_type = 2
				if (type === 'signal')
					message_type = 3
				const data = {
					keyPair: keypair,
					recipientId: recipient_name,
					message,
					message_type
				}

				const res = request('GET', hotNode() + '/api/accounts/getPublicKey?address=' + recipient_name);
				const answer = JSON.parse(res.getBody().toString());

				if (answer.success) {
					const encrypt_data = encrypter.encodeMessage(data.message, keypair, answer.publicKey);

					data.message = encrypt_data.message
					data.own_message = encrypt_data.own_message
					transaction = transactionFormer.createTransaction(constants.transactionTypes.CHAT_MESSAGE, data);
					if (isEncode) return transaction;
					const res = JSON.parse(request('POST', hotNode() + '/api/transactions/process', {
						json: {
							transaction
						}
					}).getBody().toString());

					return res;

				}
			} catch (e) {
				log.error(' Send ' + type + ': ' + e);
				return false;
			}
		}

	}

};


// {
// success: true,
// nodeTimestamp: 38796752,
// transactionId: '5738662183517760803'
// }
