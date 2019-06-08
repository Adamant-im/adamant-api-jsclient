const request = require('request');
module.exports = (node) => {
	return (uri, isUrl, isNoJson) => {
		return new Promise(resolve => {
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
					resolve(null, e);
				}
			});
		});
	};
};
