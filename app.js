const app = require('./config/express');
const { port } = require('./config/vars');
require('./config/mongoose')

app.listen(port, () => {
    console.log(`Server listening on ${port}`);
});
