const logger = require('../logger');

describe('logger: log', () => {
  const logLevel = 'log';

  test('Should log log level', (done) => {
    logger.initLogger(logLevel, {
      log(str) {
        expect(str).toBe('log');

        done();
      },
    });

    logger.log('log');
  });

  test('Should log info level', (done) => {
    logger.initLogger(logLevel, {
      info(str) {
        expect(str).toBe('info');

        done();
      },
    });

    logger.info('info');
  });

  test('Should log warn level', (done) => {
    logger.initLogger(logLevel, {
      warn(str) {
        expect(str).toBe('warn');

        done();
      },
    });

    logger.warn('warn');
  });

  test('Should log error level', (done) => {
    logger.initLogger(logLevel, {
      error(str) {
        expect(str).toBe('error');

        done();
      },
    });

    logger.error('error');
  });
});

describe('logger: info', () => {
  const logLevel = 'info';

  test('Should not log log level', (done) => {
    logger.initLogger(logLevel, {
      log() {
        done('Log level has been called');
      },
    });

    logger.log('log');
    done();
  });

  test('Should log info level', (done) => {
    logger.initLogger(logLevel, {
      info(str) {
        expect(str).toBe('info');

        done();
      },
    });

    logger.info('info');
  });

  test('Should log warn level', (done) => {
    logger.initLogger(logLevel, {
      warn(str) {
        expect(str).toBe('warn');

        done();
      },
    });

    logger.warn('warn');
  });

  test('Should log error level', (done) => {
    logger.initLogger(logLevel, {
      error(str) {
        expect(str).toBe('error');

        done();
      },
    });

    logger.error('error');
  });
});

describe('logger: warn', () => {
  const logLevel = 'warn';

  test('Should not log log level', (done) => {
    logger.initLogger(logLevel, {
      log() {
        done('Log level has been called');
      },
    });

    logger.log('log');
    done();
  });

  test('Should not log info level', (done) => {
    logger.initLogger(logLevel, {
      info() {
        done('Info level has been called');
      },
    });

    logger.info('info');
    done();
  });

  test('Should log warn level', (done) => {
    logger.initLogger(logLevel, {
      warn(str) {
        expect(str).toBe('warn');

        done();
      },
    });

    logger.warn('warn');
  });

  test('Should log error level', (done) => {
    logger.initLogger(logLevel, {
      error(str) {
        expect(str).toBe('error');

        done();
      },
    });

    logger.error('error');
  });
});

describe('logger: error', () => {
  const logLevel = 'error';

  test('Should not log log level', (done) => {
    logger.initLogger(logLevel, {
      log() {
        done('Log level has been called');
      },
    });

    logger.log('log');
    done();
  });

  test('Should not log info level', (done) => {
    logger.initLogger(logLevel, {
      info() {
        done('Info level has been called');
      },
    });

    logger.info('info');
    done();
  });

  test('Should not log warn level', (done) => {
    logger.initLogger(logLevel, {
      warn() {
        done('Warn level has been called');
      },
    });

    logger.warn('warn');
    done();
  });

  test('Should log error level', (done) => {
    logger.initLogger(logLevel, {
      error(str) {
        expect(str).toBe('error');

        done();
      },
    });

    logger.error('error');
  });
});
