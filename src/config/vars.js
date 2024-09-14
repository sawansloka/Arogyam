require('dotenv').config();

module.exports = {
  port: process.env.PORT,
  dbUri: process.env.DB_URI,
  jwtSecretKey: process.env.JWT_SECRET,
  adminSecretKey: process.env.ADMIN_SECRET_KEY,
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URL,
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  folderId: process.env.GOOGLE_DRIVE_FOLDER_ID
};
