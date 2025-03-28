/* eslint-disable no-restricted-syntax */
const winston = require('winston');
const morgan = require('morgan');
const path = require('path');

const getCallerInfo = () => {
  const error = new Error();
  const stackLines = error.stack.split('\n');

  for (const line of stackLines) {
    const match = line.match(/\((.*):(\d+):\d+\)/);
    if (match) {
      const filePath = match[1];
      const lineNumber = match[2];

      if (
        !filePath.includes('node_modules') &&
        !filePath.includes('node:') &&
        !filePath.includes('internal/') &&
        !filePath.includes('logger.js')
      ) {
        return `${path.basename(filePath)}:${lineNumber}`;
      }
    }
  }

  return '';
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.printf(({ timestamp, level, message, caller }) =>
      JSON.stringify({
        level: level.toUpperCase(),
        caller: caller || '',
        time: timestamp,
        message
      })
    )
  ),
  transports: [new winston.transports.Console()]
});

const originalLog = logger.info;
logger.info = function (message, ...args) {
  const caller = getCallerInfo();
  originalLog.call(logger, message, { caller, ...args });
};

const responseInterceptor = (req, res, next) => {
  const oldSend = res.send;

  res.send = function (data) {
    try {
      res.locals.responseBody = JSON.parse(data);
    } catch (e) {
      res.locals.responseBody = data;
    }
    oldSend.apply(res, arguments);
  };

  next();
};

const morganMiddleware = morgan(
  (tokens, req, res) =>
    JSON.stringify({
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      response_time: `${tokens['response-time'](req, res)}ms`,
      request_body: req.body || {},
      response_body: res.locals.responseBody || {}
    }),
  { stream: { write: (message) => logger.info(JSON.parse(message)) } }
);

module.exports = { logger, responseInterceptor, morganMiddleware };
