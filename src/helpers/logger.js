const logger = {
  errorLevel: 'log',
  logger: console,

  initLogger(errorLevel, log) {
    if (errorLevel) {
      this.errorLevel = errorLevel;
    }

    if (log) {
      this.logger = log;
    }
  },
  error(str) {
    if (['error', 'warn', 'info', 'log'].includes(this.errorLevel)) {
      this.logger.error(str);
    }
  },
  warn(str) {
    if (['warn', 'info', 'log'].includes(this.errorLevel)) {
      this.logger.warn(str);
    }
  },
  info(str) {
    if (['info', 'log'].includes(this.errorLevel)) {
      this.logger.info(str);
    }
  },
  log(str) {
    if (this.errorLevel === 'log') {
      this.logger.log(str);
    }
  },
};

module.exports = logger;
