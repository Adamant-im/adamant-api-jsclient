const axios = require('axios');
const _ = require('lodash');
const logger = require('../helpers/logger');
const validator = require('../helpers/validator');

const DEFAULT_GET_REQUEST_RETRIES = 3; // How much re-tries for get-requests by default. Total 3+1 tries

module.exports = (nodeManager) => {
	return (endpoint, params, maxRetries = DEFAULT_GET_REQUEST_RETRIES, retryNo = 0) => {

		let url = _.trim(endpoint, "/ ")
		if (!url || typeof(endpoint) !== 'string')
			return new Promise((resolve, reject) => {
				reject({
					success: false,
					error: 'Bad parameters',
					message: `Wrong endpoint parameter: ${endpoint}`
				})
			})

    url = nodeManager.node() + '/api/' + url;
    return axios.get(url, { params })
      .then(function (response) {
        return validator.formatRequestResults(response, true)
      })
      .catch(function (error) {
				let logMessage = `[ADAMANT js-api] Get-request: Request to ${url} failed with ${error.response ? error.response.status : undefined} status code, ${error.toString()}. Message: ${error.response ? _.trim(error.response.data, '\n') : undefined}. Try ${retryNo+1} of ${maxRetries+1}.`;
				if (retryNo < maxRetries) {
					logger.log(`${logMessage} Retrying…`);
					return nodeManager.changeNodes()
						.then(function () {
							return module.exports(nodeManager)(endpoint, params, maxRetries, ++retryNo)
						})
				}
				logger.warn(`${logMessage} No more attempts, returning error.`);
        return validator.formatRequestResults(error, false)
      })

  }
};
