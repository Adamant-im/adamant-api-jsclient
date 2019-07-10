const request = require('request');

module.exports = (node, changeNodes, log) => {
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
					log.error(`Error response node: ${currentNode}`);
					resolve(null);
				}
			});
		});
	};
};
