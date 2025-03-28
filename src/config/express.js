const express = require('express');
const cors = require('cors');
const routes = require('../api/routes');
const { morganMiddleware, responseInterceptor } = require('./logger');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.json());
app.use(cors());

app.use(responseInterceptor);
app.use(morganMiddleware);

app.use(routes);

module.exports = app;
