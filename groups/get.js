const axios = require('axios');
const logger = require('../helpers/logger');
const validator = require('../helpers/validator');

const DEFAULT_GET_REQUEST_RETRIES = 3; // How much re-tries for get-requests by default. Total 3+1 tries

module.exports = (nodeManager) => {
	return (endpoint, params, maxRetries = DEFAULT_GET_REQUEST_RETRIES, retryNo = 0) => {

		let url = trimAny(endpoint, "/ ");
		if (!url || !validator.validateEndpoint(endpoint))
			  return validator.badParameter('endpoint')

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

function trimAny(str, chars) {
	if (!str || typeof str !== 'string')
		return ''
	let start = 0, 
		end = str.length;
	while(start < end && chars.indexOf(str[start]) >= 0)
		++start;
	while(end > start && chars.indexOf(str[end - 1]) >= 0)
		--end;
	return (start > 0 || end < str.length) ? str.substring(start, end) : str;
}

