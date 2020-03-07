const Get = require('./groups/get');
const decodeMsg = require('./groups/decodeMsg');
const Send = require('./groups/send');
const healthCheck = require('./helpers/healthCheck');
const eth = require('./groups/eth');
const syncGet = require('./groups/syncGet');
const transactionFormer = require('./helpers/transactionFormer');
const keys = require('./helpers/keys');
const encrypter = require('./helpers/encrypter');
const socket = require('./helpers/wsClient');

module.exports = (params, log) => {
	log = log || console;
	const {node, changeNodes} = healthCheck(params.node, log);
	const syncReq = syncGet(node, changeNodes, log);
	
	return {
		get: Get(syncReq, log),
		send: Send(node, log),
		decodeMsg,
		eth,
		syncGet: syncReq,
		transactionFormer,
		keys,
		encrypter,
		socket
	};
};
