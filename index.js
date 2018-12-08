const Get = require('./groups/get');
const Send = require('./groups/send');
const healthCheck = require('./helpers/healthCheck');

module.exports = (config) => {
	const hotNode=healthCheck(config.node);
    return {
        get: Get(hotNode),
		send: Send(hotNode, config.passPhrase)
	}
}