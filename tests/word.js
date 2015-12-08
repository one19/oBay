const test = require('blue-tape');
const fetch = require('node-fetch');
const _ = require('lodash');
const fixture = require('../fixtures/word');

const assertOk = (t) => {
  return (res) => {
    return t.ok(res.ok, 'statusCode is 2xx');
  }
};

const unwrapJSON = (res) => {
  return res.json()
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

const poster = suffix => data => {
  return fetch(url+suffix, {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify( data )
  });
};

const deleter = suffix => () => {
  return fetch(url+suffix, {
    method: 'delete',
    headers: {
      'Accept': 'application/json',
    }
  });
};

const wordPoster = poster('/words')

const wordCreator = times => {
  return Promise.all(_.times(times, () => {
    const data = fixture.valid();
    return wordPoster(data)
    .then(unwrapJSON)
  }));
};

const pop = data => data[0];

const singlewordCreator = () => wordCreator(1).then(pop);

test('POSTing a valid sprint should return 200', (t) => {
  const word = fixture.valid();
  return wordPoster(word)
  .then(assertOk(t));
});

test('GET /words/:id should return 200', (t) => {
  return singlewordCreator()
  .then(body => fetch(url+'/words/'+body.id))
  .then(assertOk(t));
});

test('GET /words should return 200', (t) => {
  return singlewordCreator()
  .then(() => fetch(url+'/words'))
  .then(assertOk(t));
});

test('GET /words should return an object with a .result property', (t) => {
  return singlewordCreator()
  .then(() => fetch(url+'/words'))
  .then(res => res.json())
  .then(json => {
    t.equal(typeof json, 'object');
    t.ok(json.result);
  });
});

test('GET /words should accept search params in the querystring', (t) => {
  return wordCreator(2)
  .then(words => {
    return getJSON('/words?name='+words[0].name)
    .then(json => {
      t.equal(json.length, 1);
      t.equal(json[0].name, words[0].name);
    });
  });
});

test('GET /words should not match non-property search params in the querystring', (t) => {
  return wordCreator(2)
  .then(words => {
    return getJSON('/words?foo='+words[0].name)
    .then(json => {
      t.ok(json.length > 1);
    });
  });
});

test('GET /words should return an array', (t) => {
  return singlewordCreator()
  .then(() => getJSON('/words'))
  .then(json => {
    t.ok(Array.isArray(json));
  });
});

test('POSTing a valid word should actually persist it', (t) => {
  return singlewordCreator()
  .then(spec => {
    return getJSON('/words/'+spec.id)
    .then((json) => {
      t.equal(json.name, spec.name);
    });
  });
});

test('POSTing an updated word should actually persist it', (t) => {
  return singlewordCreator()
  .then(body => {
    body.name = 'Something else';
    return body
  })
  .then(body => poster('/words/'+body.id)(body))
  .then(unwrapJSON)
  .then(body => getJSON('/words/'+body.id))
  .then((json) => {
    t.equal(json.name, 'Something else');
  });
});

test('DELETEing a word should return 200', (t) => {
  return singlewordCreator()
  .then(body => deleter('/words/'+body.id)())
  .then(assertOk(t));
});

test('DELETEing a word should actually delete it', (t) => {
  return singlewordCreator()
  .then(body => deleter('/words/'+body.id)())
  .then(unwrapOldVal)
  .then(body => fetch(url+'/words/'+body.id))
  .then(res => {
    t.equal(res.status, 404);
  });
});
