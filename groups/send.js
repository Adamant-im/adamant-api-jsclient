const request = require('sync-request');
const log = require('../helpers/log');
const keys = require('../helpers/keys');
const constants = require('../helpers/constants');
const transactionFormer = require('../helpers/transactionFormer');

module.exports = (hotNode, passPhrase) => {
	
	return (passPhrase, address, payload, type='tokens') => {
		const recipient_name = address
		const keypair = keys.createKeypairFromPassPhrase(passPhrase);
		
		if (type === 'tokens') { 
			try{
				const amount = parseInt(parseFloat(String(payload)) * 100000000);
				const data = {
					keyPair: keypair,
					recipientId: recipient_name,
					amount: amount
				}
				const transaction = transactionFormer.createTransaction(constants.transactionTypes.SEND, data)
				const res = JSON.parse(request('POST', hotNode() + '/api/transactions/process', {json:{transaction}}).getBody().toString());
				
				if(res.success) return res;
				return false;
				} catch(e){
				log.error(' Send tokens: '+e);
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
