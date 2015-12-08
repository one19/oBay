const bandname = require('bandname');
const generate = require('json-schema-faker');
const schema = require('../schemas/note.json');

module.exports = {
  valid: () => {
    return generate(schema);
  }
};
