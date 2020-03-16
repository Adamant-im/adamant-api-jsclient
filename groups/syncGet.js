const request = require('request');
const logger = require('../helpers/logger');

module.exports = (node, changeNodes) => {
	return (uri, isUrl, isNoJson) => {
		return new Promise(resolve => {
			let url = isUrl && uri || node() + uri;
			request(url, (a, b) => {
				try {
					const {body} = b;
					if (isNoJson) {
						resolve(body);
					} else {
						resolve(JSON.parse(body));
					}
				} catch (e) {
					let output = `Failed to process Syn-Get request ${url}. `;
					if (isUrl) { // Request not to ADAMANT node
						output += `Host may be unavailable. Error: ${e}`
					} else { // Request to ADAMANT node 
						output += `Forcing to change active node now. Error: ${e}`
						changeNodes();
					}
					logger.warn(output);
					resolve(null);
				}
			});
		});
	};
};
