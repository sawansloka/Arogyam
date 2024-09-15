const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const { dbUri } = require('../../config/vars');

function upload() {
  const storage = new GridFsStorage({
    url: dbUri,
    file: (req, file) =>
      new Promise((resolve) => {
        const fileInfo = {
          filename: file.originalname,
          bucketName: 'assetsBucket'
        };
        resolve(fileInfo);
      })
  });

  return multer({ storage });
}

module.exports = { upload };
