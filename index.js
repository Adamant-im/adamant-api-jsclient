const Get = require('./groups/get');
const Send = require('./groups/send');


module.exports = (config) => {
    return {
        get: Get(config.node),
		send: Send(config.node, config.passPhrase)
	}
}