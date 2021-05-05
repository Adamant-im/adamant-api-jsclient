const get = require('./groups/get');
const decodeMsg = require('./groups/decodeMsg');
const Send = require('./groups/send');
const healthCheck = require('./helpers/healthCheck');
const eth = require('./groups/eth');
const syncGet = require('./groups/syncGet');
const transactionFormer = require('./helpers/transactionFormer');
const keys = require('./helpers/keys');
const encrypter = require('./helpers/encrypter');
const socket = require('./helpers/wsClient');
const logger = require('adamant-api/helpers/logger');

module.exports = (params, log) => {
	log = log || console;
	logger.initLogger(params.logLevel, log);
	const {node, changeNodes} = healthCheck(params.node);
	const nodeManager = healthCheck(params.node);
	const syncReq = syncGet(node, changeNodes);
	
	return {
		get: get(nodeManager),
		send: Send(node),
		decodeMsg,
		eth,
		syncGet: syncReq,
		transactionFormer,
		keys,
		encrypter,
		socket
	};
};
