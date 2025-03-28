const winston = require('winston');
const morgan = require('morgan');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.printf(({ timestamp, level, message }) =>
      JSON.stringify({
        level: level.toUpperCase(),
        time: timestamp,
        message
      })
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

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
