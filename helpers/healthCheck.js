const request = require('request');
const _ = require('lodash');
const socket = require('./wsClient');
const logger = require('./logger');

const CHECK_NODES_INTERVAL = 60 * 5 * 1000; // Update active nodes every 5 minutes
const HEIGHT_EPSILON = 10; // Used to group nodes by height and choose synced

module.exports = (nodes) => {

	isCheckingNodes = false;
	activeNode = nodes[0];
	liveNodes = [];

	/**
		* Updates active nodes. If nodes are already updating, returns Promise of previous call
    * @returns {Promise} Call changeNodes().then to do something when update complete
  	*/
	function changeNodes (isPlannedUpdate = false) {
		if (!this.isCheckingNodes) {
			this.changeNodesPromise = new Promise(async (resolve) => {
				if (!isPlannedUpdate) {
					logger.warn('[ADAMANT js-api] Health check: Forcing to update active nodes…');
				}
				await checkNodes(_.shuffle(nodes), this)
				resolve(true)
			});
		}
		return this.changeNodesPromise
	}

	changeNodes(true)
	setInterval(() => { changeNodes(true)	}, CHECK_NODES_INTERVAL);

	return {

		/**
     * @returns {string} Current active node, f. e. http://88.198.156.44:36666
     */
		node: () => {
			return activeNode;
		},

		changeNodes

	};

};

/**
	* Requests every ADAMANT node for its status, makes a list of live nodes, and chooses one active
	* @param nodes {Array} Array of nodes to request
	* @param context {Object} Object, storing liveNodes and activeNode
	* @returns {Promise} Call changeNodes().then to do something when update complete
	*/
async function checkNodes(nodes, context) {

	context.isCheckingNodes = true;
	context.liveNodes = [];

	try {

		for (const n of nodes) {
			try {
				const start = unixTimestamp();
				const req = await checkNode(n + '/api/node/status');

				if (req.status) {
					context.liveNodes.push({
						node: n,
						ifHttps: n.startsWith("https"),
						url: n.replace(/^https?:\/\/(.*)$/, '$1').split(":")[0],
						outOfSync: false,
						ping: unixTimestamp() - start,
						height: req.status.network.height,
						heightEpsilon: Math.round(req.status.network.height / HEIGHT_EPSILON),
						ip: req.ip,
						socketSupport: req.status.wsClient && req.status.wsClient.enabled,
						wsPort: req.status.wsClient.port
					});

				} else {
					logger.log(`[ADAMANT js-api] Health check: Node ${n} haven't returned its status`);
				}

			} catch (e) {
				logger.log(`[ADAMANT js-api] Health check: Error while checking node ${n}:`, e);
			}
		}

		const count = context.liveNodes.length;
		if (!count) {
			logger.error('[ADAMANT js-api] Health check: All of nodes are unavailable. Check internet connection and nodes list in config.');
			return;
		}

		// Set activeNode to one that have maximum height and minimum ping
		if (count === 1) {
			context.activeNode = context.liveNodes[0].node;
		} else if (count === 2) {
			const h0 = context.liveNodes[0];
			const h1 = context.liveNodes[1];
			context.activeNode = h0.height > h1.height ? h0.node : h1.node;
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
				if (groups[key].length > biggestGroup.length) {
					biggestGroup = groups[key];
				}
			});
			// All the nodes from the biggestGroup list are considered to be in sync, all the others are not
			context.liveNodes.forEach(node => {
				node.outOfSync = !biggestGroup.includes(node)
			})
			biggestGroup.sort((a, b) => a.ping - b.ping);
			context.liveNodes.sort((a, b) => a.ping - b.ping);
			context.activeNode = biggestGroup[0].node; // Use node with minimum ping among which are synced
		}
		socket.reviseConnection(context.liveNodes);
		logger.log(`[ADAMANT js-api] Health check: Found ${context.liveNodes.length} supported nodes. Active node is ${context.activeNode}.`);
		
	} catch (e) {
		logger.warn('[ADAMANT js-api] Health check: Error in checkNodes()', e);
	}

	context.isCheckingNodes = false;

}

/**
	* Requests status from a single ADAMANT node
	* @param url {string} Node URL to request
	* @returns {Promise} Node's status information
	*/
// Request status from a single node
function checkNode(url) {
	return new Promise(resolve => {
		request(url, (err, res, body) => {
			if (err) {
				resolve(false);
			} else {
				try {
					const status = JSON.parse(body);
					const result = { status: status, ip: res.connection.remoteAddress };
					resolve(result);
				} catch (e) {
					resolve(false);
				}
			}
		});
	});
};

function unixTimestamp() {
	return new Date().getTime();
}
