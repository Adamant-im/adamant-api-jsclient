const request = require('request');
const _ = require('lodash');

module.exports = (nodes, log) => {
	if (typeof nodes === 'string') {
		return () => nodes;
	}
	this.hotNode = nodes[0];
	checkNodes(nodes, this, log);
	setInterval(() => {
		checkNodes(_.shuffle(nodes), this, log);
	}, 10000);

	return {
		node: () => {
			return this.hotNode;
		},
		changeNodes: _.throttle(() => {
			log.warn('[Health check]: Force change node!');
			checkNodes(_.shuffle(nodes), this, log);
		}, 5000)
	};
};

async function checkNodes(nodes, context, log) {
	const health = [];
	nodes.forEach(async n => {
		try {
			const start = unix();
			const height = await checkNode(n + '/api/node/status');
			if (height) {
				health.push({
					node: n,
					ping: unix() - start,
					height: Math.round(height / 20)
				});
			} else {
				console.log('Error check', n, height);
			}
		} catch (e) {}
	});

	setTimeout(() => {

		const count = health.length;
		if (!count) {
			log.error('[Health check]: ALL nodes don`t ping! Pls check you internet connection!');
			return;
		}

		if (count === 1) {
			context.hotNode = health[0].node;
		} else if (count === 2) {
			const h0 = health[0];
			const h1 = health[1];
			context.hotNode = h0.height > h1.height ? h0.node : h1.node;
		} else {
			let biggestGroup = [];
			const groups = _.groupBy(health, n => n.height);
			Object.keys(groups).forEach(key => {
				if (groups[key].length > biggestGroup.length){
					biggestGroup = groups[key];
				}
			});
			biggestGroup.sort((a, b) => a.ping - b.ping);
			context.hotNode = biggestGroup[0].node;
		}
		console.log('hotNode', context.hotNode);
	}, 3000);
}

function checkNode(url) {
	return new Promise(resolve => {
		request(url, (err, res, body) => {
			if (err) {
				resolve(false);
			} else {
				try {
					const heigth = JSON.parse(body).network.height;
					resolve(heigth);
				} catch (e) {
					resolve(false);
				}
			}
		});
	});
};

function unix(){
	return new Date().getTime();
}
