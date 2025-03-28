const winston = require('winston');

const logger = winston.createLogger({
  level: 'info', // Log only if the severity is 'info' or higher
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
    new winston.transports.Console(), // Log to console
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }), // Log errors to file
    new winston.transports.File({ filename: 'logs/combined.log' }) // Log all levels to file
  ]
});

module.exports = logger;
