const app = require('./src/config/express');
const { port } = require('./src/config/vars');
require('./src/config/mongoose');

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
