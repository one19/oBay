const app = require('./index.js');

const server = app.listen(process.env.PORT, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log('oBay API listening at http://%s:%s', host, port);
});
