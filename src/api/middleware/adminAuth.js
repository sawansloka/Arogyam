const jwt = require('jsonwebtoken');
const StatusCodes = require('http-status-codes');
const { jwtSecretKey } = require('../../config/vars');
const Admin = require('../../model/admin');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');

    const decoded = jwt.verify(token, jwtSecretKey);

    const admin = await Admin.findOne({
      _id: decoded._id,
      'tokens.token': token
    });

    if (!admin) {
      throw new Error('Unauthorized: Admin not found');
    }

    req.token = token;
    req.user = admin;
    next();
  } catch (e) {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .send({ error: 'Please authorize as an admin!' });
  }
};

module.exports = adminAuth;
