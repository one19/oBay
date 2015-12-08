const jsen = require('jsen');

const db = require('../lib/db.js');
const schema = require('../schemas/user.json');
const validate = jsen(schema);

const firstChange = res => {
  return {
    result: res.changes[0].new_val || res.changes[0],
    old_val: res.changes[0].old_val
  }
}

const wrapResult = res => {
  return {result: res}
}

const properties = Object.keys(schema.properties);

module.exports = {
  get: (params) => {
    const table = db.table('users');
    if (params && params.id) {
      return table.get(params.id).run()
      .then(wrapResult);
    }

    const filterParams = properties.reduce((p, prop) => {
      p[prop] = params[prop];
      return p
    }, {});

    return table.filter(filterParams).run()
    .then(wrapResult)
  },
  create: (user) => {
    const valid = validate(user);
    if (!valid) return Promise.reject(valid);
    return db.table('users').insert(user, {returnChanges: true}).run()
    .then(firstChange);
  },
  update: (user) => {
    const valid = validate(user);
    if (!valid) return Promise.reject(valid);
    return db.table('users').update(user, {returnChanges: true}).run()
    .then(firstChange);
  },
  delete: (id) => {
    return db.table('users').get(id).delete({returnChanges: true}).run()
    .then(firstChange);
  }
};
