const request = require('request');
const _ = require('lodash');
const socket = require('./wsClient');
const logger = require('./logger');
const HEIGHT_EPSILON = 10; // Used to group nodes by height and choose synced

module.exports = (nodes) => {

	if (typeof nodes === 'string') {
		return () => nodes;
	}
	this.hotNode = nodes[0];
	this.liveNodes = [];
	checkNodes(nodes, this);
	
	setInterval(() => {
		checkNodes(_.shuffle(nodes), this);
	}, 60 * 1000);

	return {
		node: () => { // Current active node for REST requests
			return this.hotNode;
		},
		changeNodes: _.throttle(() => {
			logger.warn('[Health check]: Forcing to change node.');
			// To do: choose not the fastest node? May the fastest be defective?
			checkNodes(_.shuffle(nodes), this);
		}, 5000)
	};
};

// Request every node for its status and make a list of active ones
async function checkNodes(nodes, context) {

	context.liveNodes = [];
	nodes.forEach(async n => {
		try {
			const start = unix();
			const req = await checkNode(n + '/api/node/status');

			if (req.status) {
				context.liveNodes.push({
					node: n,
					ifHttps: n.startsWith("https"),
					url: n.replace(/^https?:\/\/(.*)$/, '$1').split(":")[0],
					outOfSync: false,
					ping: unix() - start,
					height: req.status.network.height,
					heightEpsilon: Math.round(req.status.network.height / HEIGHT_EPSILON),
					ip: req.ip,
					socketSupport: req.status.wsClient && req.status.wsClient.enabled,
					wsPort: req.status.wsClient.port
				});
			} else {
				logger.log(`Node ${n} haven't returned its status.`);
			}
		} catch (e) {
			logger.log('Error while checking node', n);
		}
	});

	setTimeout(() => { // Allow 3 seconds to request nodes

		const count = context.liveNodes.length;
		if (!count) {
			logger.error('[Health check]: All of ADAMANT nodes are unavailable. Check internet connection and nodes list in config.');
			return;
		}

		// Set hotNode to one that have maximum height and minimum ping
		if (count === 1) {
			context.hotNode = context.liveNodes[0].node;
		} else if (count === 2) {
			const h0 = context.liveNodes[0];
			const h1 = context.liveNodes[1];
			context.hotNode = h0.height > h1.height ? h0.node : h1.node;

			// Mark node outOfSync if needed
			if (h0.heightEpsilon > h1.heightEpsilon) {
				context.liveNodes[1].outOfSync = true
			} else if (h0.heightEpsilon < h1.heightEpsilon) {
				context.liveNodes[0].outOfSync = true
			}

		} else {
			let biggestGroup = [];
			const groups = _.groupBy(context.liveNodes, n => n.heightEpsilon);
			Object.keys(groups).forEach(key => {
				if (groups[key].length > biggestGroup.length){
					biggestGroup = groups[key];
				}
			});

			// All the nodes from the biggestGroup list are considered to be in sync, all the others are not
    		context.liveNodes.forEach(node => {
				node.outOfSync = !biggestGroup.includes(node)
			  })
			  
			biggestGroup.sort((a, b) => a.ping - b.ping);
			context.liveNodes.sort((a, b) => a.ping - b.ping);
			context.hotNode = biggestGroup[0].node; // Use node with minimum ping among which are synced
		}
		socket.reviseConnection(context.liveNodes);
		logger.log(`[Health check] Supported nodes: ${context.liveNodes.length}. hotNode is ${context.hotNode}.`);
		// logger.logog('liveNodes', context.liveNodes, context.liveNodes.length);
	}, 3000);
}

// Request status from a single node
function checkNode(url) {
	return new Promise(resolve => {
		request(url, (err, res, body) => {
			if (err) {
				resolve(false);
			} else {
				try {
					const status = JSON.parse(body);
					const result = {status: status, ip: res.connection.remoteAddress};
					resolve(result);
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
