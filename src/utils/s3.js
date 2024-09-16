const { S3, PutObjectCommand } = require('@aws-sdk/client-s3');
const { digitalOceanService } = require('../config/vars');

const s3Client = new S3({
  forcePathStyle: false,
  endpoint: digitalOceanService.endpoint,
  region: digitalOceanService.region,
  credentials: {
    accessKeyId: digitalOceanService.accessKey,
    secretAccessKey: digitalOceanService.acessSecret
  }
});

exports.uploadToS3 = async (fileBuffer, filename) => {
  const uploadParams = {
    Bucket: digitalOceanService.metaBucket,
    Key: filename,
    Body: fileBuffer,
    ACL: 'public-read'
  };
  await s3Client.send(new PutObjectCommand(uploadParams));
};
