const express = require('express');
const cors = require('cors');
const routes = require('../api/routes');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.json());
app.use(cors());

app.use(routes);

module.exports = app;
