const request = require('sync-request');
const log = require('../helpers/log');


module.exports = (hotNode) => {
	
return (type, input) => {
        let endpoint = false,
		explorer_url = false,
		returned_field = false;
        switch (type) {
            case 'account':
			endpoint = '/api/accounts?address=' + input
			break
            case 'full_account':
			explorer_url = 'https://explorer.adamant.im/api/getAccount?address=' + input
			break
            case 'delegate_forged':
			endpoint = '/api/delegates/forging/getForgedByAccount?generatorPublicKey=' + input // за кого отдал голос адрес
			break;
			
			case 'account_delegates':
			endpoint = '/api/accounts/delegates?address=' + input // за кого отдал голос адрес
			returned_field = 'delegates';
			break
			
            case 'block':
			endpoint = '/api/blocks/get?id=' + input
			break
            case 'state':
			endpoint = '/api/states/get?id=' + input
			break
            case 'delegate':
			endpoint = '/api/delegates/get?username=' + input
			returned_field = 'delegate';
			break
            case 'delegate_voters':
			endpoint = '/api/delegates/voters?publicKey=' + input // кто отдал голос за делегата
			returned_field = 'accounts';
			break
			// case 'forged_by_account':
			//     endpoint = '/api/delegates//forging/getForgedByAccount?publicKey=' + input // кто отдал голос за делегата
			//     break
			
            case 'blocks':
			endpoint = '/api/blocks'; 
			returned_field = 'blocks';
			break
			
            case 'transaction':
			endpoint = '/api/transactions/get?id=' + input
			break
            case 'transactions':
			endpoint = '/api/transactions?' + input.split(' ').join('').split(',').join('&')
			break
            default:
			log.error('Not implemented yet')
			return false;
		}
        try {
            const url = explorer_url || hotNode() + endpoint;
            const res = JSON.parse(request('GET', url).getBody().toString());
            if (res.success) {
                if (returned_field) return res[returned_field];
				
                return res;
			}
            log.error('Failed Get request: ' + type + ' ' + url + ' ' + res.error);
            return false;
			} catch (e) {
            log.error('Catch Get request ' + type + ': ' + e);
		}
		
		
	}
	
}