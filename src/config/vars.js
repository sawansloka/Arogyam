require('dotenv').config();

module.exports = {
  port: process.env.PORT,
  dbUri: process.env.DB_URI,
  jwtSecretKey: process.env.JWT_SECRET,
  adminSecretKey: process.env.ADMIN_SECRET_KEY,
  assetsBucket: process.env.ASSETS_BUCKET,
  googleService: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URL,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    folderId: process.env.GOOGLE_DRIVE_PRESCRIPTION_FOLDER_ID
  },
  digitalOceanService: {
    endpoint: process.env.DIGITAL_OCEAN_ENDPOINT,
    region: process.env.DIGITAL_OCEAN_REGION,
    originUrl: process.env.DIGITAL_OCEAN_ORIGIN_ENDPOINT,
    accessKey: process.env.DIGITAL_OCEAN_ACCESS_KEY,
    acessSecret: process.env.DIGITAL_OCEAN_ACCESS_SECRET,
    metaBucket: process.env.S3_META_ASSETS_BUCKET
  }
};
