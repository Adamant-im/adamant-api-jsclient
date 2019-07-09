const Get = require('./groups/get');
const decodeMsg = require('./groups/decodeMsg');
const Send = require('./groups/send');
const healthCheck = require('./helpers/healthCheck');
const eth = require('./groups/eth');
const syncGet = require('./groups/syncGet');

module.exports = (params) => {
	const {node, changeNodes} = healthCheck(params.node);
	const syncReq = syncGet(node, changeNodes);
	return {
		get: Get(syncReq),
		send: Send(node),
		decodeMsg,
		eth,
		syncGet: syncReq
	};
};
