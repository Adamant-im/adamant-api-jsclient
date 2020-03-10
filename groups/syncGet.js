const request = require('request');

module.exports = (node, changeNodes) => {
	return (uri, isUrl, isNoJson) => {
		return new Promise(resolve => {
			const currentNode = node();
			let url = isUrl && uri || node() + uri;
			request(url, (a, b) => {
				try {
					const {body} = b;
					if (isNoJson){
						resolve(body);
					} else {
						resolve(JSON.parse(body));
					}
				} catch (e) {
					changeNodes();
					logger.warn(`Failed to process Syn-Get request to ADAMANT node ${currentNode}. Forcing to change active node now. Error: ${e}.`);
					resolve(null);
				}
			});
		});
	};
};
