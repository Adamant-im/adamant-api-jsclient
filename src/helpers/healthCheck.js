const dnsPromises = require('dns').promises;

const axios = require('../helpers/axiosClient');
const socket = require('./wsClient');
const logger = require('./logger');
const validator = require('./validator');

const {RE_IP, RE_HTTP_URL} = require('./constants');

const CHECK_NODES_INTERVAL = 60 * 5 * 1000; // Update active nodes every 5 minutes
const HEIGHT_EPSILON = 5; // Used to group nodes by height and choose synced

module.exports = (nodes, checkHealthAtStartup = true) => {
  const nodesList = nodes;
  let isCheckingNodes = false;

  // Note: it may be not synced; and before first health check a node can reply with obsolete data
  let [activeNode] = nodesList;

  /**
    * Updates active nodes. If nodes are already updating, returns Promise of previous call
    * @param {boolean} isPlannedUpdate
    * @return {Promise} Call changeNodes().then to do something when update complete
    */
  async function changeNodes(isPlannedUpdate = false) {
    if (!isCheckingNodes) {
      if (!isPlannedUpdate) {
        logger.warn('[ADAMANT js-api] Health check: Forcing to update active nodes…');
      }

      await checkNodes(!isPlannedUpdate);

      return true;
    }
  }

  /**
    * Requests every ADAMANT node for its status, makes a list of live nodes, and chooses one active
    * @param {boolean} forceChangeActiveNode
    */
  async function checkNodes(forceChangeActiveNode) {
    isCheckingNodes = true;

    const liveNodes = [];

    try {
      for (const node of nodesList) {
        try {
          const start = unixTimestamp();

          const req = await checkNode(`${node}/api/node/status`);

          const [url] = node.replace(RE_HTTP_URL, '$1').split(':');
          const ifIP = RE_IP.test(url);

          const ip = ifIP ? url : await getIP(url);
          const ifHttps = node.startsWith('https');

          if (req.status) {
            liveNodes.push({
              node,
              ifIP,
              url,
              ip,
              ifHttps,
              outOfSync: false,
              ping: unixTimestamp() - start,
              height: req.status.network.height,
              heightEpsilon: Math.round(req.status.network.height / HEIGHT_EPSILON),
              socketSupport: req.status.wsClient?.enabled,
              wsPort: req.status.wsClient?.port,
            });
          } else {
            logger.log(`[ADAMANT js-api] Health check: Node ${node} haven't returned its status`);
          }
        } catch (e) {
          logger.log(`[ADAMANT js-api] Health check: Error while checking node ${node}, ${e}`);
        }
      }

      const count = liveNodes.length;

      let outOfSyncCount = 0;

      if (!count) {
        logger.error(`[ADAMANT js-api] Health check: All of ${nodesList.length} nodes are unavailable. Check internet connection and nodes list in config.`);
      } else {
        // Set activeNode to one that have maximum height and minimum ping
        if (count === 1) {
          activeNode = liveNodes[0].node;
        } else if (count === 2) {
          const [h0, h1] = liveNodes;

          activeNode = h0.height > h1.height ? h0.node : h1.node;

          // Mark node outOfSync if needed
          if (h0.heightEpsilon > h1.heightEpsilon) {
            liveNodes[1].outOfSync = true;
            outOfSyncCount += 1;
          } else if (h0.heightEpsilon < h1.heightEpsilon) {
            liveNodes[0].outOfSync = true;
            outOfSyncCount += 1;
          }
        } else {
          let biggestGroup = [];
          // Removing lodash: const groups = _.groupBy(liveNodes, n => n.heightEpsilon);
          const groups = liveNodes.reduce((grouped, node) => {
            const int = Math.floor(node.heightEpsilon); // Excessive, it is already rounded

            if (!Object.prototype.hasOwnProperty.call(grouped, int)) {
              grouped[int] = [];
            }

            grouped[int].push(node);

            return grouped;
          }, {});

          Object.keys(groups).forEach((key) => {
            if (groups[key].length > biggestGroup.length) {
              biggestGroup = groups[key];
            }
          });

          // All the nodes from the biggestGroup list are considered to be in sync, all the others are not
          liveNodes.forEach((node) => {
            node.outOfSync = !biggestGroup.includes(node);
          });

          outOfSyncCount = liveNodes.length - biggestGroup.length;

          biggestGroup.sort((a, b) => a.ping - b.ping);
          liveNodes.sort((a, b) => a.ping - b.ping);

          if (forceChangeActiveNode && biggestGroup.length > 1 && activeNode === biggestGroup[0].node) {
            // Use random node from which are synced
            activeNode = biggestGroup[validator.getRandomIntInclusive(1, biggestGroup.length - 1)].node;
          } else {
            // Use node with minimum ping among which are synced
            activeNode = biggestGroup[0].node;
          }
        }

        socket.reviseConnection(liveNodes);

        const unavailableCount = nodesList.length - liveNodes.length;
        const supportedCount = liveNodes.length - outOfSyncCount;

        let nodesInfoString = '';

        if (unavailableCount) {
          nodesInfoString += `, ${unavailableCount} nodes didn't respond`;
        }

        if (outOfSyncCount) {
          nodesInfoString += `, ${outOfSyncCount} nodes are not synced`;
        }

        logger.log(`[ADAMANT js-api] Health check: Found ${supportedCount} supported and synced nodes${nodesInfoString}. Active node is ${activeNode}.`);
      }
    } catch (e) {
      logger.warn('[ADAMANT js-api] Health check: Error in checkNodes(), ' + e);
    }

    isCheckingNodes = false;
  }

  if (checkHealthAtStartup) {
    changeNodes(true);

    setInterval(
        () => changeNodes(true),
        CHECK_NODES_INTERVAL,
    );
  }

  return {
    /**
     * @return {string} Current active node, f. e. http://88.198.156.44:36666
     */
    node: () => activeNode,
    changeNodes,
  };
};

async function getIP(url) {
  try {
    const addresses = await dnsPromises.resolve4(url);

    if (addresses && addresses[0] !== '0.0.0.0') {
      return addresses[0];
    }
  } catch (error) {
    return;
  }
}

/**
  * Requests status from a single ADAMANT node
  * @param {string} url Node URL to request
  * @return {Promise} Node's status information
  */
function checkNode(url) {
  return axios.get(url)
      .then((response) => ({status: response.data}))
      .catch((err) => false);
}

function unixTimestamp() {
  return new Date().getTime();
}
