const express = require('express');
const httpStatus = require('http-status');
const fs = require('fs');
const path = require('path');
const adminRoutes = require('./admin.route');
const publicRoutes = require('./public.route');

const router = express.Router();

router.get('/app/health', (req, res) => {
  res.send({ message: 'Server is up!!!', status: httpStatus.OK });
});

router.get('/app/deephealth', (req, res) => {
  res.send({
    message: 'Server is running very well!!!',
    status: httpStatus.OK
  });
});

router.get('/commit.txt', (req, res) => {
  const commitFilePath = path.join(process.cwd(), 'commit.txt');

  if (fs.existsSync(commitFilePath)) {
    res.sendFile(commitFilePath);
  } else {
    res.status(404).send('Commit ID not found');
  }
});

router.use('/v1/admin', adminRoutes);
router.use('/v1', publicRoutes);

module.exports = router;
