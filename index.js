const Get = require('./groups/get');
const decodeMsg = require('./groups/decodeMsg');
const Send = require('./groups/send');
const healthCheck = require('./helpers/healthCheck');
const eth = require('./groups/eth');
const syncGet = require('./groups/syncGet');

module.exports = (params) => {
	const hotNode = healthCheck(params.node);
	const syncReq = syncGet(hotNode);
	return {
		get: Get(syncReq),
		send: Send(hotNode),
		decodeMsg,
		eth,
		syncGet: syncReq
	};
};
