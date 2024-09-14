const express = require('express');
const httpStatus = require('http-status');
const adminRoutes = require('./admin.route');
const publicRoutes = require('./public.route');

const router = express.Router();

router.get('/app/health', (req, res) => {
  res.send({ message: 'Server is up!!!', status: httpStatus.OK });
});

router.get('/app/deephealth', (req, res) => {
  res.send({ message: 'Server is running well!!!', status: httpStatus.OK });
});

router.use('/v1/admin', adminRoutes);
router.use('/v1', publicRoutes);

module.exports = router;
