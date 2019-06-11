const request = require('request');
const _ = require('lodash');

module.exports = (nodes) => {
	if (typeof nodes === 'string') {
		return () => nodes;
	}

	this.hotNode = nodes[0];
	checkNodes(nodes, this);

	setInterval(() => {
		checkNodes(_.shuffle(nodes), this)
	}, 60000);

	return () => {
		return this.hotNode;
	};
};

function checkNodes(nodes, context) {
	nodes.forEach(async n => {
		const res = await checkNode(n + '/api/peers/version');
		if (res) {
			context.hotNode = n;
		} else {
			// console.log('Error health check ' + n);
		}
	});
}

function checkNode(url) {
	return new Promise(resolve => {
		request(url, (err, res, body) => {
			if (err) {
				resolve(false);
			} else if (res.statusCode === 200) {
				resolve(true);
			}
		});
	});
};