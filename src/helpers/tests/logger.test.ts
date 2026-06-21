import {Logger, LogLevel} from '../logger';

const mockLogger = {
  log() {},
  error() {},
  warn() {},
  info() {},
};

describe('logger: log', () => {
  const logLevel = LogLevel.Log;

  test('should log log level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      log(str) {
        expect(str).toBe('log');
        done();
      },
    });

    logger.log('log');
  });

  test('should log info level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      info(str) {
        expect(str).toBe('info');
        done();
      },
    });

    logger.info('info');
  });

  test('should log warn level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      warn(str) {
        expect(str).toBe('warn');
        done();
      },
    });

    logger.warn('warn');
  });

  test('should log error level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      error(str) {
        expect(str).toBe('error');
        done();
      },
    });

    logger.error('error');
  });
});

describe('logger: info', () => {
  const logLevel = LogLevel.Info;

  test('should not log log level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      log() {
        done('Log level has been called');
      },
    });

    logger.log('log');
    done();
  });

  test('should log info level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      info(str) {
        expect(str).toBe('info');
        done();
      },
    });

    logger.info('info');
  });

  test('should log warn level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      warn(str) {
        expect(str).toBe('warn');
        done();
      },
    });

    logger.warn('warn');
  });

  test('should log error level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      error(str) {
        expect(str).toBe('error');
        done();
      },
    });

    logger.error('error');
  });
});

describe('logger: warn', () => {
  const logLevel = LogLevel.Warn;

  test('should not log log level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      log() {
        done('Log level has been called');
      },
    });

    logger.log('log');
    done();
  });

  test('should not log info level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      info() {
        done('Info level has been called');
      },
    });

    logger.info('info');
    done();
  });

  test('should log warn level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      warn(str) {
        expect(str).toBe('warn');
        done();
      },
    });

    logger.warn('warn');
  });

  test('should log error level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      error(str) {
        expect(str).toBe('error');
        done();
      },
    });

    logger.error('error');
  });
});

describe('logger: error', () => {
  const logLevel = LogLevel.Error;

  test('should not log log level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      error(str) {
        expect(str).toBe('error');
        done();
      },
    });

    logger.log('log');
    done();
  });

  test('should not log info level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      info() {
        done('Info level has been called');
      },
    });

    logger.info('info');
    done();
  });

  test('should not log warn level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      warn() {
        done('Warn level has been called');
      },
    });

    logger.warn('warn');
    done();
  });

  test('should log error level', done => {
    const logger = new Logger(logLevel, {
      ...mockLogger,
      error(str) {
        expect(str).toBe('error');
        done();
      },
    });

    logger.error('error');
  });
});

describe('logger: level normalization', () => {
  const createMockLogger = () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
  });

  test.each(['none', LogLevel.None])('disables all output for %s', level => {
    const output = createMockLogger();
    const logger = new Logger(level, output);

    logger.error('error');
    logger.warn('warn');
    logger.info('info');
    logger.log('log');
    logger.debug('debug');

    expect(logger.level).toBe(LogLevel.None);
    expect(output.error).not.toHaveBeenCalled();
    expect(output.warn).not.toHaveBeenCalled();
    expect(output.info).not.toHaveBeenCalled();
    expect(output.log).not.toHaveBeenCalled();
    expect(output.debug).not.toHaveBeenCalled();
  });

  test('debug is a distinct, more verbose level', () => {
    const output = createMockLogger();
    const logger = new Logger('debug', output);

    logger.log('log');
    logger.debug('debug');

    expect(logger.level).toBe(LogLevel.Debug);
    expect(output.log).toHaveBeenCalledWith('log');
    expect(output.debug).toHaveBeenCalledWith('debug');
  });

  test('debug falls back to log for backward-compatible custom loggers', () => {
    const output = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
    };
    const logger = new Logger('debug', output);

    logger.debug('debug');

    expect(output.log).toHaveBeenCalledWith('debug');
  });

  test.each(['trace', 'unknown'])('%s falls back to log', level => {
    const output = createMockLogger();
    const logger = new Logger(level, output);

    logger.log('log');
    logger.debug('debug');

    expect(logger.level).toBe(LogLevel.Log);
    expect(output.log).toHaveBeenCalledWith('log');
    expect(output.debug).not.toHaveBeenCalled();
  });

  test.each([-2, 5, Number.NaN])(
    'invalid numeric level %s falls back to log',
    level => {
      const output = createMockLogger();
      const logger = new Logger(level, output);

      logger.log('log');

      expect(logger.level).toBe(LogLevel.Log);
      expect(output.log).toHaveBeenCalledWith('log');
    },
  );
});
