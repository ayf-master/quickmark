const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  base: { service: 'quickmark' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname,service'
      }
    }
  } : {})
});

module.exports = logger;
