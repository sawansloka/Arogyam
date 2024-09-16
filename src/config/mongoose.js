const mongoose = require('mongoose');
const { dbUri } = require('./vars');

mongoose
  .connect(dbUri)
  .then(() =>
    console.log('MongoDB database connection established successfully')
  )
  .catch((error) => console.error('MongoDB connection error:', error));
