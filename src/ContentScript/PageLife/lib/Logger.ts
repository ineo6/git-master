import GitMaster from '../core/GitMaster';

class Logger {
  level: {
    [propName: string]: string;
  };

  ctx: GitMaster;

  constructor(ctx: GitMaster) {
    this.level = {
      success: 'green',
      info: 'blue',
      warn: 'yellow',
      error: 'red',
    };
    this.ctx = ctx;
  }

  // @ts-ignore
  protected handleLog(type: string, msg: string | Error): string | Error | undefined {
    if (this.ctx.getConfig() === undefined || !this.ctx.getConfig('silent')) {
      this.handleWriteLog(type, msg, this.ctx);

      return msg;
    }
  }

  protected handleWriteLog(type: string, msg: string | Error, _ctx?: GitMaster): void {
    try {
      const logLevel = this.ctx.getConfig('logLevel');

      if (this.checkLogLevel(type, logLevel)) {
        let log = `${Date.now()} [GitMaster ${type.toUpperCase()}] ${msg}`;

        if (typeof msg === 'object' && type === 'error') {
          log += `\n------Error Stack Begin------\n${JSON.stringify(msg.stack)}\n-------Error Stack End-------`;
        }

        if (type === 'success') {
          console.log(log);
        } else {
          // @ts-ignore
          console[type](log);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  protected checkLogLevel(type: string, level: undefined | string | string[]): boolean {
    if (level === undefined || level === 'all') {
      return true;
    }
    if (Array.isArray(level)) {
      return level.some((item: string) => item === type || item === 'all');
    } else {
      return type === level;
    }
  }

  success(msg: string | Error): string | Error | undefined {
    return this.handleLog('success', msg);
  }

  info(msg: string | Error): string | Error | undefined {
    return this.handleLog('info', msg);
  }

  error(msg: string | Error): string | Error | undefined {
    return this.handleLog('error', msg);
  }

  warn(msg: string | Error): string | Error | undefined {
    return this.handleLog('warn', msg);
  }
}

export default Logger;
