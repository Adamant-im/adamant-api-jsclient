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

	return {
		node: () => {
			return this.hotNode;
		},
		changeNodes: () => {
			console.log('Health check warn: Force change node!');
			checkNodes(_.shuffle(nodes), this);
		}
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
	// console.log('Health check update node: ', context.hotNode);
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
