const constants = require('./constants');

module.exports = {

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
