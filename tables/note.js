const db = require('../lib/db.js');

module.exports = () => {
  return db.tableCreate('notes').run()
  .catch((err) => {
    if (err.message.split('\n')[0] === 'Table `'+process.env.RETHINK_NAME+'.notes` already exists in:') return;
    throw err;
  })
  .then(() => {
    db.table('notes').wait().run()
  })
  //.then(() => r.table('entities').indexCreate('emails', { multi: true }).run())
  //.catch(err => {
  //  if (err.message.indexOf('Index `emails` already exists') > -1 )return;
  //  throw err;
  //})
}
