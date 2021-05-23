const constants = require('./constants');

module.exports = {

  isNumeric(str) {
    if (typeof str !== "string") return false
    return !isNaN(str) && !isNaN(parseFloat(str))
  },

  validatePassPhrase(passPhrase) {
    if (!passPhrase || typeof(passPhrase) !== 'string' || passPhrase.length < 30)
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

  validateMessage(message) {
    if (typeof(message) !== 'string')
		  return false
    else
      return true
  },

  badParameter(name, value) {
    return new Promise((resolve, reject) => {
      resolve({
        success: false,
        error: 'Bad parameters',
        message: `Wrong ${name} parameter${value ? ': ' + value : ''}`
      })
    })
  }

};
