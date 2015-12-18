const test = require('blue-tape');
const fetch = require('node-fetch');
const _ = require('lodash');
const fixture = require('../fixtures/note');
const IO = require('socket.io-client');

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
const putter = sender('put');

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
      console.log('NOOOOTES', notes[0])
      console.log('NOOOTES', notes[0].words[0].poSpeech)
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

test('GET /notes should paginate if asked', (t) => {
  return noteCreator(5)
  .then(() => getJSON('/notes?limit=2'))
  .then(json => {
    t.equal(json.length, 2);
  });
});

test('GET /notes should skip if asked', (t) => {
  return noteCreator(5)
  .then(() => getJSON('/notes?limit=2'))
  .then(first => {
    t.equal(first.length, 2);
    return getJSON('/notes?limit=2&skip=2')
    .then(second => {
      t.equal(second.length, 2);
      t.notDeepEqual(first, second);
    });
  });
});

test('GET /notes should orderBy if asked', (t) => {
  return noteCreator(15)
  .then(() => getJSON('/notes?orderBy=name'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /notes should orderBy asc if asked', (t) => {
  return noteCreator(15)
  .then(() => getJSON('/notes?orderBy=name&order=asc'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /notes should orderBy desc if asked', (t) => {
  return noteCreator(15)
  .then(() => getJSON('/notes?orderBy=name&order=desc'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name < b.name) return 1;
      if (a.name > b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /notes?count=true&limit=n should return n matching docs with a count of all matching docs ', (t) => {
  return noteCreator(10)
  .then(() => fetch(url+'/notes?count=true&limit=5'))
  .then(res => res.json())
  .then(json => {
    t.equal(json.result.length, 5);
    t.ok(json.count);
    t.ok(json.count > 5);
  });
});

test('GET /notes?limit=n should return n matching docs without a count of all matching docs ', (t) => {
  return noteCreator(10)
  .then(() => fetch(url+'/notes?limit=5'))
  .then(res => res.json())
  .then(json => {
    t.equal(json.result.length, 5);
    t.ok(!json.count);
  });
});

test('GET /notes?count=true&result=false should return only a count with no matching docs', (t) => {
  return noteCreator(10)
  .then(() => fetch(url+'/notes?count=true&result=false'))
  .then(res => res.json())
  .then(json => {
    t.ok(!json.result, 'has no result');
    t.ok(json.count, 'has a count');
    t.ok(json.count > 5, 'count is greater than 5');
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

test('PUTing an updated note should actually persist it', (t) => {
  return singlenoteCreator()
  .then(body => {
    body.name = 'Something else';
    return body
  })
  .then(body => putter('/notes/'+body.id)(body))
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

test('opening a websocket connection to a note should return it', (t) => {
  return singlenoteCreator()
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/notes', {query: 'id='+body.id, forceNew: true});
      io.on('record', data => {
        resolve(data.new_val);
        io.disconnect();
      });
    })
    .then(data => {
      t.deepEqual(data, body);
    });
  });
});

test('opening a websocket connection to notes should return all of them', (t) => {
  return noteCreator(2)
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/notes', {forceNew: true});
      var count = 0;
      io.on('record', () => {
        count++;
        if (count > 1) {
          resolve();
          io.disconnect();
        }
      });
    });
  });
});

test('opening a websocket connection to notes should return changed documents', (t) => {
  return singlenoteCreator()
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/notes', {forceNew: true});
      io.on('state', data => {
        if (data.state === 'ready') {
          const target = _.assign({}, body, {name: 'ohai'});
          io.on('record', data => {
            t.deepEqual(data.new_val, target);
            t.notDeepEqual(data.new_val, body);
            io.disconnect();
            resolve();
          });
          putter('/notes/'+body.id)(target)
        };
      });
    });
  });
});

test('websockets should accept the same filter params as GET requests', (t) => {
  noteCreator(2)
  .then(notes => {
    const target = notes[0];
    return new Promise(resolve => {
      const io = IO(url+'/notes', {query: {name: target.name}, forceNew: true});
      io.on('record', data => {
        t.deepEqual(data.new_val, target);
      });
      io.on('state', data => {
        if (data.state != 'ready') return;
        io.disconnect();
        t.end();
      });
    });
  });
});

test('websockets should accept the same limit param as GET requests', (t) => {
  noteCreator(2)
  .then(notes => {
    return new Promise(resolve => {
      const io = IO(url+'/notes', {query: {limit: 1}, forceNew: true});
      var count = 0;
      io.on('record', data => {
        count++;
      });
      io.on('state', data => {
        if (data.state != 'ready') return;
        io.disconnect();
        t.equal(count, 1);
        t.end();
      });
    });
  });
});
