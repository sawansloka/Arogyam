const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const { dbUri, assetsBucket } = require('../../config/vars');

function upload() {
  const storage = new GridFsStorage({
    url: dbUri,
    file: (req, file) =>
      new Promise((resolve) => {
        const fileInfo = {
          filename: `${file.fieldname}.${file.mimetype.split('/')[1]}`,
          bucketName: assetsBucket
        };
        resolve(fileInfo);
      })
  });

  return multer({ storage });
}

module.exports = { upload };
