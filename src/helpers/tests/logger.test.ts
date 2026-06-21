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
  });

  test.each(['none', LogLevel.None])('disables all output for %s', level => {
    const output = createMockLogger();
    const logger = new Logger(level, output);

    logger.error('error');
    logger.warn('warn');
    logger.info('info');
    logger.log('log');

    expect(logger.level).toBe(LogLevel.None);
    expect(output.error).not.toHaveBeenCalled();
    expect(output.warn).not.toHaveBeenCalled();
    expect(output.info).not.toHaveBeenCalled();
    expect(output.log).not.toHaveBeenCalled();
  });

  test.each(['debug', 'trace', 'unknown'])('%s falls back to log', level => {
    const output = createMockLogger();
    const logger = new Logger(level, output);

    logger.error('error');
    logger.warn('warn');
    logger.info('info');
    logger.log('log');

    expect(logger.level).toBe(LogLevel.Log);
    expect(output.error).toHaveBeenCalledWith('error');
    expect(output.warn).toHaveBeenCalledWith('warn');
    expect(output.info).toHaveBeenCalledWith('info');
    expect(output.log).toHaveBeenCalledWith('log');
  });

  test.each([-2, 4, Number.NaN])(
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
