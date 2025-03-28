const { S3, PutObjectCommand } = require('@aws-sdk/client-s3');
const { digitalOceanService } = require('../config/vars');
const { logger } = require('../config/logger');

const s3Client = new S3({
  forcePathStyle: false,
  endpoint: digitalOceanService.endpoint,
  region: digitalOceanService.region,
  credentials: {
    accessKeyId: digitalOceanService.accessKey,
    secretAccessKey: digitalOceanService.accessSecret
  }
});

exports.uploadToS3 = async (fileBuffer, filename, bucket, folder = '') => {
  try {
    const folderPath = folder !== '' ? `${folder}/` : '';
    const uploadParams = {
      Bucket: bucket,
      Key: `${folderPath}${filename}`,
      Body: fileBuffer,
      ACL: 'public-read'
    };
    const res = await s3Client.send(new PutObjectCommand(uploadParams));
    return res;
  } catch (error) {
    logger.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
};
