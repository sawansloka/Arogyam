const mongoose = require('mongoose');
const { dbUri } = require('./vars');
const { logger } = require('./logger');

const connectToDatabase = async () => {
  try {
    await mongoose.connect(dbUri);
    logger.info('MongoDB database connection established successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectToDatabase();
