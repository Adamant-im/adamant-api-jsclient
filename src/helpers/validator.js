const constants = require('./constants');
const bigNumber = require('bignumber.js');

module.exports = {
  getRandomIntInclusive(minimum, maximum) {
    const min = Math.ceil(minimum);
    const max = Math.floor(maximum);

    // The maximum is inclusive and the minimum is inclusive
    return Math.floor(Math.random() * (max - min + 1) + min);
  },
  isNumeric(str) {
    if (typeof str !== 'string') {
      return false;
    }

    return !isNaN(parseFloat(str));
  },
  tryParseJSON(jsonString) {
    try {
      const o = JSON.parse(jsonString);

      return typeof o === 'object' ? o : false;
    } catch (e) {
      return false;
    }
  },
  validatePassPhrase(passPhrase) {
    return typeof passPhrase === 'string' && passPhrase.length > 30;
  },
  validateEndpoint(endpoint) {
    return typeof endpoint === 'string';
  },
  validateAdmAddress(address) {
    return typeof(address) === 'string' && constants.RE_ADM_ADDRESS.test(address);
  },
  validateAdmPublicKey(publicKey) {
    return (
      typeof publicKey === 'string' &&
      publicKey.length === 64 &&
      constants.RE_HEX.test(publicKey)
    );
  },
  validateAdmVoteForPublicKey(publicKey) {
    return (
      typeof publicKey === 'string' &&
      constants.RE_ADM_VOTE_FOR_PUBLIC_KEY.test(publicKey)
    );
  },
  validateAdmVoteForAddress(address) {
    return (
      typeof address === 'string' &&
      constants.RE_ADM_VOTE_FOR_ADDRESS.test(address)
    );
  },
  validateAdmVoteForDelegateName(delegateName) {
    return (
      typeof delegateName === 'string' &&
      constants.RE_ADM_VOTE_FOR_DELEGATE_NAME.test(delegateName)
    );
  },
  validateIntegerAmount(amount) {
    return Number.isSafeInteger(amount);
  },
  validateStringAmount(amount) {
    return this.isNumeric(amount);
  },
  validateMessageType(messageType) {
    return [1, 2, 3].includes(messageType);
  },
  validateMessage(message, messageType) {
    if (typeof message !== 'string') {
      return {
        result: false,
        error: `Message must be a string`,
      };
    }

    if ([2, 3].includes(messageType)) {
      const json = this.tryParseJSON(message);

      if (!json) {
        return {
          result: false,
          error: `For rich and signal messages, 'message' must be a JSON string`,
        };
      }

      if (json.type && json.type.toLowerCase().includes('_transaction')) {
        if (json.type.toLowerCase() !== json.type) {
          return {
            result: false,
            error: `Value '<coin>_transaction' must be in lower case`,
          };
        }
      }

      if (typeof json.amount !== 'string' || !this.validateStringAmount(json.amount)) {
        return {
          result: false,
          error: `Field 'amount' must be a string, representing a number`,
        };
      }
    }

    return {
      result: true,
    };
  },
  validateDelegateName(name) {
    if (typeof name !== 'string') {
      return false;
    }

    return constants.RE_ADM_DELEGATE_NAME.test(name);
  },
  admToSats(amount) {
    return bigNumber(String(amount))
        .multipliedBy(constants.SAT)
        .integerValue()
        .toNumber();
  },
  async badParameter(name, value, customMessage) {
    return {
      success: false,
      errorMessage: `Wrong '${name}' parameter${value ? ': ' + value : ''}${customMessage ? '. Error: ' + customMessage : ''}`,
    };
  },
  formatRequestResults(response, isRequestSuccess) {
    let results = {
      details: {},
    };

    if (isRequestSuccess) {
      results = {
        success: response.data && response.data.success,
        data: response.data,
        details: {
          status: response.status,
          statusText: response.statusText,
          response: response,
        },
      };

      if (!results.success && results.data) {
        results.errorMessage = `Node's reply: ${results.data.error}`;
      }
    } else {
      results = {
        success: false,
        data: undefined,
        details: {
          status: response.status,
          statusText: response.response && response.response.statusText,
          response: response.response && response.response.status,
          error: response.toString(),
          message: (
            response.response &&
            response.response.data &&
            response.response.data.toString().trim()
          ),
          errorMessage: `${results.details.error}${results.details.message ? '. Message: ' + results.details.message : ''}`,
        },
      };
    }

    return results;
  },
};
