require('dotenv').config();

module.exports = {
  port: process.env.PORT,
  dbUri: process.env.DB_URI,
  jwtSecretKey: process.env.JWT_SECRET,
  adminSecretKey: process.env.ADMIN_SECRET_KEY
};
