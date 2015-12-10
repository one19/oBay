const db = require('../lib/db.js');

module.exports = () => {
  return db.tableCreate('users').run()
  .catch((err) => {
    if (err.message.split('\n')[0] === 'Table `'+process.env.RETHINK_NAME+'.users` already exists in:') return;
    throw err;
  })
  .then(() => {
    db.table('users').wait().run()
  })
  //.then(() => db.table('users').indexCreate('name').run())
  //.catch(err => {
  //  if (err.message.indexOf('Index `name` already exists') > -1 )return;
  //  throw err;
  //})
}
