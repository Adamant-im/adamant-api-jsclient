const constants = require('./constants');

module.exports = {

  validatePassPhrase(passPhrase) {
    console.log(passPhrase)
    if (!passPhrase || typeof(passPhrase) !== 'string' || passPhrase.length < 30)
		  return false
    else
      return true
  },

  validateAdmAddress(address) {
    console.log(address)
    if (!address || typeof(address) !== 'string' || !constants.RE_ADM_ADDRESS.test(address))
		  return false
    else
      return true
  },

  validateIntegerAmount(amount) {
    console.log(amount, typeof(amount)) 
    if (!amount || typeof(amount) !== 'number' || isNaN(amount) || !isSafeInteger(amount))
		  return false
    else
      return true
  },

  badParameter(name, value) {
    console.log('bad param', name, value)
    return new Promise((resolve, reject) => {
      resolve({
        success: false,
        error: 'Bad parameters',
        message: `Wrong ${name} parameter${value ? ': ' + value : ''}`
      })
    })
  }


};
