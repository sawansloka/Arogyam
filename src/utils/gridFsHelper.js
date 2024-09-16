const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { dbUri, assetsBucket } = require('../config/vars');

let gfs;
let gridfsBucket;

const conn = mongoose.createConnection(dbUri);

conn.once('open', async () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: assetsBucket
  });
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection(assetsBucket);
});

const getImage = async (filename) => {
  const file = await gfs.files.findOne({ filename });
  const readStream = gridfsBucket.openDownloadStream(file._id);
  return readStream;
};

// const deleteImage = async (filename) => {
//   return new Promise((resolve, reject) => {
//     gfs.files.findOne({ filename }, (err, file) => {
//       if (err || !file) {
//         return reject(new Error('File not found'));
//       }

//       // Delete the chunks and file
//       gfs.remove({ _id: file._id, root: assetsBucket }, (err, gridStore) => {
//         if (err) return reject(err);
//         resolve('File deleted successfully');
//       });
//     });
//   });
// };

module.exports = { getImage };
