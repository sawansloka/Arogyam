require('dotenv').config();

module.exports = {
  port: process.env.PORT,
  dbUri: process.env.DB_URI,
  jwtSecretKey: process.env.JWT_SECRET,
  adminSecretKey: process.env.ADMIN_SECRET_KEY,
  clientId: process.env.GOOGLE_CLIENT_ID,
  assetsBucket: process.env.ASSETS_BUCKET,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URL,
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  prescriptionFolderId: process.env.GOOGLE_DRIVE_PRESCRIPTION_FOLDER_ID,
  metaImageFolderId: process.env.GOOGLE_DRIVE_METADATA_FOLDER_ID
};
