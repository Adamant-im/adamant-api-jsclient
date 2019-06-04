const Get = require('./groups/get');
const decodeMsg = require('./groups/decodeMsg');
const Send = require('./groups/send');
const healthCheck = require('./helpers/healthCheck');
const eth = require('./groups/eth');

module.exports = (config) => {
	const hotNode = healthCheck(config.node);
	return {
		get: Get(hotNode),
		send: Send(hotNode),
		decodeMsg,
		eth
	};
};