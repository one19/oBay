const bandname = require('bandname');
const generate = require('json-schema-faker');
const schema = require('../schemas/wordGroup.json');

module.exports = {
  valid: () => {
    return generate(schema);
  }
};
