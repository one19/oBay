const fs = require('fs');
const path = require('path');
const test = require('blue-tape');

const setup = require('root/setup');
const app = require('root/index');
const db = require('root/lib/db');

const fetch = require('node-fetch');
const _ = require('lodash');
const IO = require('socket.io-client');

const DB_NAME = process.env.RETHINK_NAME;


//TODO: FIX ME
const assertOk = (t) => {
  return (res) => {
    return t.ok(res.ok, 'statusCode is 2xx');
  }
};

const unwrapJSON = (res) => {
  return res.json()
  .then(json => {
    return json;
  })
  .then(json => json.result);
}

const unwrapOldVal = (res) => {
  return res.json()
  .then(json => json.old_val);
}

const getJSON = (suffix) => {
  return fetch(url+suffix)
  .then(unwrapJSON);
}

const url = 'http://localhost:'+process.env.PORT;

const sender = method => suffix => data => {
  return fetch(url+suffix, {
    method: method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify( data )
  });
};

const poster = sender('post');
// const putter = sender('put');

// const notePoster = poster('/notes')

const thingCreator = (thing, times) => {
  return Promise.all(_.times(times, () => {
    var fixture = require('root/fixtures'+thing+'.js');
    const data = fixture.valid();
    return poster(thing)(data)
    .then(unwrapJSON)
  }));
};

const pop = data => data[0];

const server = app.listen(process.env.PORT, () => {
  setup()
    .then(() => {
      files = fs.readdirSync('./tests').filter(function(file) {
        if (file === 'index.js') return false;
        if (file === 'fixtures') return false;
        if (file.indexOf('swp') > -1) return false;
        return file.indexOf('.js');
      }).forEach(function(file) {
        return thingCreator('/'+file.slice(0,-3), 50);
      });
    });
  return Promise.resolve(app.close())
});
