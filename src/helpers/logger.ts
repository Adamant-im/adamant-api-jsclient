export enum LogLevel {
  Error = 1,
  Warn = 2,
  Info = 3,
  Log = 4,
}

export type CustomLogger = Record<
  "error" | "warn" | "info" | "log",
  (str: string) => void
>;

export class Logger {
  logger: CustomLogger;
  level: LogLevel;

  constructor(level: LogLevel = LogLevel.Log, logger: CustomLogger = console) {
    this.level = level;
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
