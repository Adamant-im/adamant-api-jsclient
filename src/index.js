const get = require('./groups/get');
const getPublicKey = require('./groups/getPublicKey');
const decodeMsg = require('./groups/decodeMsg');

const newDelegate = require('./groups/newDelegate');
const voteForDelegate = require('./groups/voteForDelegate');
const sendTokens = require('./groups/sendTokens');
const sendMessage = require('./groups/sendMessage');
const healthCheck = require('./helpers/healthCheck');

const eth = require('./groups/eth');
const dash = require('./groups/dash');
const btc = require('./groups/btc');
const doge = require('./groups/doge');
const lsk = require('./groups/lsk');

const encryptor = require('./helpers/encryptor');
const socket = require('./helpers/wsClient');
const logger = require('./helpers/logger');

const constants = require('./helpers/constants.js');
const transactionFormer = require('./helpers/transactionFormer');
const keys = require('./helpers/keys');

/**
 * Create new API instance
 * @param {{ node: string, checkHealthAtStartup: boolean, logLevel: string}} params
 * @param {{ error: function, warn: function, info: function, log: function }?} customLogger
 * @param {function?} checkHealthAtStartupCallback callback which is called after the first health check or
 * just at startup when params.checkHealthAtStartup is passed
 * @return {object} API methods and helpers
 */
module.exports = (params, customLogger, checkHealthAtStartupCallback) => {
  const log = customLogger || console;

  logger.initLogger(params.logLevel, log);

  const nodeManager = healthCheck(
      params.node,
      params.checkHealthAtStartup,
      checkHealthAtStartupCallback,
  );

  return {
    get: get(nodeManager),
    getPublicKey: getPublicKey(nodeManager),
    sendTokens: sendTokens(nodeManager),
    sendMessage: sendMessage(nodeManager),
    newDelegate: newDelegate(nodeManager),
    voteForDelegate: voteForDelegate(nodeManager),
    decodeMsg,
    eth,
    dash,
    btc,
    doge,
    lsk,
    transactionFormer,
    keys,
    encryptor,
    socket,
    constants,
  };
};
