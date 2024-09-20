const StatusCodes = require('http-status-codes');

const restrictToDoctor = (req, res, next) => {
  if (!req.user.isDoctor) {
    return res.status(StatusCodes.FORBIDDEN).send({
      status: 'Error',
      message: 'Access restricted to doctors only!'
    });
  }
  next();
};

module.exports = restrictToDoctor;
