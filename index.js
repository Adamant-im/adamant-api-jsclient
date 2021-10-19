const constants = require('./helpers/constants.js');
const get = require('./groups/get');
const getPublicKey = require('./groups/getPublicKey');
const decodeMsg = require('./groups/decodeMsg');
const sendTokens = require('./groups/sendTokens');
const sendMessage = require('./groups/sendMessage');
const healthCheck = require('./helpers/healthCheck');
const eth = require('./groups/eth');
const dash = require('./groups/dash');
const btc = require('./groups/btc');
const doge = require('./groups/doge');
const transactionFormer = require('./helpers/transactionFormer');
const keys = require('./helpers/keys');
const encryptor = require('./helpers/encryptor');
const socket = require('./helpers/wsClient');
const logger = require('./helpers/logger');

module.exports = (params, log) => {
	log = log || console;
	logger.initLogger(params.logLevel, log);
	const nodeManager = healthCheck(params.node);
	
	return {
		get: get(nodeManager),
		getPublicKey: getPublicKey(nodeManager),
		sendTokens: sendTokens(nodeManager),
		sendMessage: sendMessage(nodeManager),
		decodeMsg,
		eth,
		dash,
		btc,
		doge,
		transactionFormer,
		keys,
		encryptor,
		socket,
		constants
	};
};
