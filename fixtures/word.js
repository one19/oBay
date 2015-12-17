const bandname = require('bandname');
const generate = require('json-schema-faker');
const schema = require('../schemas/word.json');

const SPEECH_PARTS = [
  "noun",
  "pronoun",
  "verb",
  "article",
  "adjective",
  "adverb",
  "conjunction",
  "preposition",
  "interjection"
]

generate.extend('faker', function(faker){
  faker.locale = "en"; // or any other language 
  faker.poS = {
    randomArray: function() {
      var poS = SPEECH_PARTS;
      var ret = [];
      for ( var i = 0; i < Math.floor((Math.random()*9) + 1); i++) { //returns random integer between 1 && 9
        ret.push( poS.splice(Math.floor(Math.random()*poS.length), 1)[0] ); //pops one of the types randomly onto our array
      }
      return ret;
    }
  }
  return faker;
});

module.exports = {
  valid: () => {
    return generate(schema);
  }
};
