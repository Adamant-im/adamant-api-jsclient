const request = require('request');
const _ = require('lodash');
const log = require('./log');

module.exports = (nodes) => {
	if (typeof nodes === 'string') {
		return () => nodes;
	}

	checkNodes(nodes, this);
	this.hotNode = nodes[0];
	setInterval(() => {
		checkNodes(_.shuffle(nodes), this);
	}, 60000);

	return {
		node: () => {
			return this.hotNode;
		},
		changeNodes: () => {
			log.warn('[Health check]: Force change node!');
			checkNodes(_.shuffle(nodes), this);
		}
	};
};

function checkNodes(nodes, context) {
	let isFind = false;
	nodes.forEach(async n => {
		const res = await checkNode(n + '/api/peers/version');
		if (res) {
			isFind = true;
			context.hotNode = n;
		}
	});
	if (!isFind && context.hotNode) {
		log.error('[Health check]: ALL nodes don`t ping! Pls check you internet connection!');
	}
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
