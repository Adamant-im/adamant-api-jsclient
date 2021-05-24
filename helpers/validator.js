const constants = require('./constants');
const BigNumber = require('bignumber.js')

module.exports = {

  getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
  },

  isNumeric(str) {
    if (typeof str !== "string") return false
    return !isNaN(str) && !isNaN(parseFloat(str))
  },

  tryParseJSON(jsonString) {
    try {
      let o = JSON.parse(jsonString);
      if (o && typeof o === "object") {
        return o;
      }
    } catch (e) { }
    return false
  },

  validatePassPhrase(passPhrase) {
    if (!passPhrase || typeof(passPhrase) !== 'string' || passPhrase.length < 30)
		  return false
    else
      return true
  },

  validateEndpoint(endpoint) {
    if (!endpoint || typeof(endpoint) !== 'string')
		  return false
    else
      return true
  },

  validateAdmAddress(address) {
    if (!address || typeof(address) !== 'string' || !constants.RE_ADM_ADDRESS.test(address))
		  return false
    else
      return true
  },

  validateIntegerAmount(amount) {
    if (!amount || typeof(amount) !== 'number' || isNaN(amount) || !Number.isSafeInteger(amount))
		  return false
    else
      return true
  },

  validateStringAmount(amount) {
    if (!amount || !this.isNumeric(amount))
		  return false
    else
      return true
  },

  validateMessageType(message_type) {
    if (!message_type || typeof(message_type) !== 'number' || ![1,2,3].includes(message_type))
		  return false
    else
      return true
  },

  validateMessage(message, message_type) {
    if (typeof(message) !== 'string')
		  return {
        result: false,
        error: `Message must be a string`
      }
    else {
      if (message_type === 2 || message_type === 3) {

        let json = this.tryParseJSON(message)

        if (!json) 
          return {
            result: false,
            error: `For rich and signal messages, 'message' must be a JSON string`
          }
        
        if (json.type && json.type.toLowerCase().includes('_transaction'))
          if (json.type.toLowerCase() !== json.type)
            return {
              result: false,
              error: `Value '<coin>_transaction' must be in lower case`
            }
      
        if (typeof json.amount !== 'string' || !this.validateStringAmount(json.amount))
          return {
            result: false,
            error: `Field 'amount' must be a string, representing a number`
          }        

      }
    }
    return {
      result: true
    }
  },

  AdmToSats(amount) {
    return BigNumber(String(amount)).multipliedBy(constants.SAT).integerValue().toNumber()
  },

  badParameter(name, value, customMessage) {
    return new Promise((resolve, reject) => {
      resolve({
        success: false,
        errorMessage: `Wrong '${name}' parameter${value ? ': ' + value : ''}${customMessage ? '. Error: ' + customMessage : ''}`
      })
    })
  },

  formatRequestResults(response, isRequestSuccess) {
    let results = {};
    results.details = {};

    if (isRequestSuccess) {
      results.success = response.data && response.data.success;
      results.data = response.data;
      results.details.status = response.status;
      results.details.statusText = response.statusText;
      results.details.response = response;
      if (!results.success && results.data)
        results.errorMessage = `Node's reply: ${results.data.error}`
    } else {
      results.success = false;
      results.data = undefined;
      results.details.status = response.response ? response.response.status : undefined;
      results.details.statusText = response.response ? response.response.statusText : undefined;
      results.details.error = response.toString();
      results.details.message = response.response && response.response.data ? response.response.data.toString().trim() : undefined;
      results.details.response = response.response;
      results.errorMessage = `${results.details.error}${results.details.message ? '. Message: ' + results.details.message : ''}`;
    }

    return results;

  }

};
