const constants = require('./constants.js');

module.exports = {
  getEpochTime(time) {
    const startTime = time ?? Date.now();

    const {epochTime} = constants;
    const epochTimeMs = epochTime.getTime();

    return Math.floor((startTime - epochTimeMs) / 1000);
  },
  getTime(time) {
    return this.getEpochTime(time);
  },
};
