const mongoose = require('mongoose');
const { dbUri } = require('./vars');
const logger = require('./logger');

mongoose
  .connect(dbUri)
  .then(() =>
    logger.info('MongoDB database connection established successfully')
  )
  .catch((error) => logger.error('MongoDB connection error:', error));
