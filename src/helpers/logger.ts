export enum LogLevel {
  Error,
  Warn,
  Info,
  Log,
}

export type CustomLogger = Record<
  'error' | 'warn' | 'info' | 'log',
  (str: string) => void
>;

export const logLevels = ['error', 'warn', 'info', 'log'] as const;

export type LogLevelName = (typeof logLevels)[number];

export class Logger {
  logger: CustomLogger;
  level: LogLevel;

  constructor(
    level: LogLevel | LogLevelName = LogLevel.Log,
    logger: CustomLogger = console
  ) {
    this.level = typeof level === 'number' ? level : logLevels.indexOf(level);
    this.logger = logger;
  }

  error(message: string) {
    if (this.level >= LogLevel.Error) {
      this.logger.error(message);
    }
  }

  warn(message: string) {
    if (this.level >= LogLevel.Warn) {
      this.logger.warn(message);
    }
  }

  info(message: string) {
    if (this.level >= LogLevel.Info) {
      this.logger.info(message);
    }
  }

  log(message: string) {
    if (this.level >= LogLevel.Log) {
      this.logger.log(message);
    }
  }
}
