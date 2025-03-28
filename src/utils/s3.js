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
    logger.info('Starting uploadToS3 function...');
    const folderPath = folder !== '' ? `${folder}/` : '';
    const uploadParams = {
      Bucket: bucket,
      Key: `${folderPath}${filename}`,
      Body: fileBuffer,
      ACL: 'public-read'
    };

    logger.info(
      `Uploading file to S3. Bucket: ${bucket}, Key: ${uploadParams.Key}`
    );
    const res = await s3Client.send(new PutObjectCommand(uploadParams));
    logger.info(`File uploaded successfully to S3. Key: ${uploadParams.Key}`);
    return res;
  } catch (error) {
    logger.error('Error uploading file to S3:', error.message);
    throw new Error('Failed to upload file to S3');
  }
};
