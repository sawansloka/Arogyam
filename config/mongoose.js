const mongoose = require('mongoose');
const { dbUri } = require('./vars');

mongoose.connect(dbUri, {
    useNewUrlParser: true,
    // useCreateIndex: true
})
    .then(() => console.log('MongoDB database connection established successfully'))
    .catch(error => console.error('MongoDB connection error:', error));