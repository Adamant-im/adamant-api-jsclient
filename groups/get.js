const axios = require('axios');
const logger = require('../helpers/logger');

module.exports = (nodeManager) => {
	return (endpoint, params) => {

		// let returned_field = false;
		// switch (type) {
		// 	case 'account':
		// 		endpoint += '/api/accounts?address=' + params;
		// 		break;
		// 	case 'account_delegates':
		// 		endpoint += '/api/accounts/delegates?address=' + params;
		// 		returned_field = 'delegates';
		// 		break;
		// 	case 'delegate':
		// 		endpoint += '/api/delegates/get?username=' + params;
		// 		returned_field = 'delegate';
		// 		break;
		// 	case 'delegate_voters':
		// 		endpoint += '/api/delegates/voters?publicKey=' + params;
		// 		returned_field = 'accounts';
		// 		break;
		// 	case 'delegate_forged':
		// 		endpoint += '/api/delegates/forging/getForgedByAccount?generatorPublicKey=' + params;
		// 		break;
		// 	case 'block':
		// 		endpoint += '/api/blocks/get?id=' + params;
		// 		break;
		// 	case 'states':
		// 		endpoint += '/api/states/get';
		// 		if (params) {
		// 			endpoint = endpoint + '?' + params;
		// 		}
		// 		break;
		// 	case 'blocks':
		// 		endpoint += '/api/blocks';
		// 		if (params) {
		// 			endpoint = endpoint + '?' + params;
		// 		}
		// 		returned_field = 'blocks';
		// 		break;
		// 	case 'transaction':
		// 		endpoint += '/api/transactions/get?id=' + params;
		// 		break;
		// 	case 'transactions':
		// 		endpoint += '/api/transactions?' + params.split(' ').join('').split(',').join('&');
		// 		break;
		// 	case 'uri':
		// 		endpoint += '/api/' + params;
		// 		break;
		// 	default:
		// 		logger.error(`ADAMANT endpoint ${type} not implemented yet. Use 'uri' to use not implemented endpoints.`);
		// 		return false;
		// }

    const url = nodeManager.node() + endpoint;
    return axios.get(url, { params })
      .then(function (response) {
        log.log(response);
        return {
          success: true,
          response
        }
      })
      .catch(function (error) {
        log.error(error);
        return {
          success: false,
          error
        }
      })
      .then(function () {
        // always executed
      });  


		try {
			
			const res = await syncReq(endpoint);
			if (res && res.success) {
				if (returned_field) {
					return res[returned_field];
				}
				return res;
			}

			logger.warn(`Get request to ADAMANT node was not successful. Type: ${type}, URL: ${endpoint}, Result: ${res && res.error}`);
			return false;

		} catch (e) {
			logger.error(`Failed to process Get request of type ${type} to ADAMANT node. Error: ${e}.`);
			return false;
		}

  }

};
