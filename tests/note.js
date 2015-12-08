const test = require('blue-tape');
const fetch = require('node-fetch');
const _ = require('lodash');
const fixture = require('../fixtures/note');

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

const notePoster = poster('/notes')

const noteCreator = times => {
  return Promise.all(_.times(times, () => {
    const data = fixture.valid();
    return notePoster(data)
    .then(unwrapJSON)
  }));
};

const pop = data => data[0];

const singlenoteCreator = () => noteCreator(1).then(pop);

test('POSTing a valid sprint should return 200', (t) => {
  const note = fixture.valid();
  return notePoster(note)
  .then(assertOk(t));
});

test('GET /notes/:id should return 200', (t) => {
  return singlenoteCreator()
  .then(body => fetch(url+'/notes/'+body.id))
  .then(assertOk(t));
});

test('GET /notes should return 200', (t) => {
  return singlenoteCreator()
  .then(() => fetch(url+'/notes'))
  .then(assertOk(t));
});

test('GET /notes should return an object with a .result property', (t) => {
  return singlenoteCreator()
  .then(() => fetch(url+'/notes'))
  .then(res => res.json())
  .then(json => {
    t.equal(typeof json, 'object');
    t.ok(json.result);
  });
});

test('GET /notes should accept search params in the querystring', (t) => {
  return noteCreator(2)
  .then(notes => {
    return getJSON('/notes?name='+notes[0].name)
    .then(json => {
      t.equal(json.length, 1);
      t.equal(json[0].name, notes[0].name);
    });
  });
});

test('GET /notes should not match non-property search params in the querystring', (t) => {
  return noteCreator(2)
  .then(notes => {
    return getJSON('/notes?foo='+notes[0].name)
    .then(json => {
      t.ok(json.length > 1);
    });
  });
});

test('GET /notes should return an array', (t) => {
  return singlenoteCreator()
  .then(() => getJSON('/notes'))
  .then(json => {
    t.ok(Array.isArray(json));
  });
});

test('POSTing a valid note should actually persist it', (t) => {
  return singlenoteCreator()
  .then(spec => {
    return getJSON('/notes/'+spec.id)
    .then((json) => {
      t.equal(json.name, spec.name);
    });
  });
});

test('POSTing an updated note should actually persist it', (t) => {
  return singlenoteCreator()
  .then(body => {
    body.name = 'Something else';
    return body
  })
  .then(body => poster('/notes/'+body.id)(body))
  .then(unwrapJSON)
  .then(body => getJSON('/notes/'+body.id))
  .then((json) => {
    t.equal(json.name, 'Something else');
  });
});

test('DELETEing a note should return 200', (t) => {
  return singlenoteCreator()
  .then(body => deleter('/notes/'+body.id)())
  .then(assertOk(t));
});

test('DELETEing a note should actually delete it', (t) => {
  return singlenoteCreator()
  .then(body => deleter('/notes/'+body.id)())
  .then(unwrapOldVal)
  .then(body => fetch(url+'/notes/'+body.id))
  .then(res => {
    t.equal(res.status, 404);
  });
});
