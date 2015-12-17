const fs = require('fs');
const path = require('path');
const test = require('blue-tape');

const setup = require('root/setup');
const app = require('root/index');
const db = require('root/lib/db');

const DB_NAME = process.env.RETHINK_NAME;

const server = app.listen(process.env.PORT, () => {
  setup()
  .then(() => {
    files = fs.readdirSync('./tests').filter(function(file) {
      if (file === 'index.js') return false;
      if (file === 'fixtures') return false;
      if (file.indexOf('swp') > -1) return false;
      return file.indexOf('.js');
    }).forEach(function(file) {
      require(path.resolve('./tests/'+file));
    });
  })
  .then(() => {
    test('teardown', () => db.dbDrop(DB_NAME));
    test('teardown', () => db.getPoolMaster().drain());
    test('teardown', () => {
      return Promise.resolve(app.close())
    });
  });
});
