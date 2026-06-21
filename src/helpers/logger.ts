export enum LogLevel {
  None = -1,
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

export type LogLevelName = 'none' | (typeof logLevels)[number];

/**
 * Logger threshold accepted by the SDK.
 *
 * Known level names receive type suggestions, while application-specific names
 * such as `debug` or `trace` are accepted and fall back to `log`.
 */
export type LogLevelInput = LogLevel | LogLevelName | (string & {});

const normalizeLogLevel = (level: LogLevelInput): LogLevel => {
  if (typeof level === 'number') {
    return Number.isInteger(level) &&
      level >= LogLevel.None &&
      level <= LogLevel.Log
      ? level
      : LogLevel.Log;
  }

  if (level === 'none') {
    return LogLevel.None;
  }

  const knownLevel = logLevels.indexOf(level as (typeof logLevels)[number]);
  return knownLevel === -1 ? LogLevel.Log : knownLevel;
};

export class Logger {
  logger: CustomLogger;
  level: LogLevel;

  constructor(
    level: LogLevelInput = LogLevel.Log,
    logger: CustomLogger = console,
  ) {
    this.level = normalizeLogLevel(level);
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
