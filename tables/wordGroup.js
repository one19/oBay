const db = require('../lib/db.js');

module.exports = () => {
  return db.tableCreate('wordGroups').run()
  .catch((err) => {
    if (err.message.split('\n')[0] === 'Table `'+process.env.RETHINK_NAME+'.wordGroups` already exists in:') return;
    throw err;
  })
  .then(() => {
    db.table('wordGroups').wait().run()
  })
  //.then(() => db.table('wordGroups').indexCreate('name').run())
  //.catch(err => {
  //  if (err.message.indexOf('Index `name` already exists') > -1 )return;
  //  throw err;
  //})
}
