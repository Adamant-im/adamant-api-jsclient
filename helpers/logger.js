let logger = {
    errorLevel: 'log',
    l: console,
    initLogger(errorLevel, log) {
        if (errorLevel)
            this.errorLevel = errorLevel;
        if (log)    
            this.l = log;
    },
	error(str) {
        if (['error', 'warn', 'info', 'log'].includes(this.errorLevel))
            this.l.error(str);
	},
	warn(str) {
        if (['warn', 'info', 'log'].includes(this.errorLevel))
            this.l.warn(str);
	},
	info(str) {
        if (['info', 'log'].includes(this.errorLevel))
            this.l.info(str);
	},
	log(str) {
        if (['log'].includes(this.errorLevel))
            this.l.log(str);
	}
};

module.exports = logger;