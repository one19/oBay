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
  //.then(() => r.table('entities').indexCreate('emails', { multi: true }).run())
  //.catch(err => {
  //  if (err.message.indexOf('Index `emails` already exists') > -1 )return;
  //  throw err;
  //})
}