const app = require('./src/config/express');
const { port } = require('./src/config/vars');
require('./src/config/mongoose');
const { logger } = require("./src/config/logger");

app.listen(port, () => {
  logger.info(`Server listening on ${port}`);
});
