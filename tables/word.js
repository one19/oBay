const db = require('../lib/db.js');

module.exports = () => {
  return db.tableCreate('words').run()
  .catch((err) => {
    if (err.message.split('\n')[0] === 'Table `'+process.env.RETHINK_NAME+'.words` already exists in:') return;
    throw err;
  })
  .then(() => {
    db.table('words').wait().run()
  })
  //.then(() => db.table('words').indexCreate('name').run())
  //.catch(err => {
  //  if (err.message.indexOf('Index `name` already exists') > -1 )return;
  //  throw err;
  //})
}
