interface LoggerConfig {
  level: 'info' | 'debug' | 'error';
}

export class Logger {
  private level: string;

  constructor(config: LoggerConfig) {
    this.level = config.level;
  }

  info(message: string, ...meta: any[]) {
    if (['info', 'debug'].includes(this.level)) {
      console.log(`[INFO] ${message}`, ...meta);
    }
  }

  debug(message: string, ...meta: any[]) {
    if (this.level === 'debug') {
      console.log(`[DEBUG] ${message}`, ...meta);
    }
  }

  error(message: string, ...meta: any[]) {
    console.error(`[ERROR] ${message}`, ...meta);
  }
}