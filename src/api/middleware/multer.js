const multer = require('multer');

const storage = multer.memoryStorage();
const uploadSimple = multer({ storage });

module.exports = { uploadSimple };
