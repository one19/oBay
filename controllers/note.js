const jsen = require('jsen');

const db = require('../lib/db.js');
const schema = require('../schemas/note.json');
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
    const table = db.table('notes');
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
  create: (note) => {
    const valid = validate(note);
    if (!valid) return Promise.reject(valid);
    return db.table('notes').insert(note, {returnChanges: true}).run()
    .then(firstChange);
  },
  update: (note) => {
    const valid = validate(note);
    if (!valid) return Promise.reject(valid);
    return db.table('notes').update(note, {returnChanges: true}).run()
    .then(firstChange);
  },
  delete: (id) => {
    return db.table('notes').get(id).delete({returnChanges: true}).run()
    .then(firstChange);
  }
};
