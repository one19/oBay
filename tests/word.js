const test = require('blue-tape');
const fetch = require('node-fetch');
const _ = require('lodash');
const fixture = require('../fixtures/word');
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

test('GET /words should paginate if asked', (t) => {
  return wordCreator(5)
  .then(() => getJSON('/words?limit=2'))
  .then(json => {
    t.equal(json.length, 2);
  });
});

test('GET /words should skip if asked', (t) => {
  return wordCreator(5)
  .then(() => getJSON('/words?limit=2'))
  .then(first => {
    t.equal(first.length, 2);
    return getJSON('/words?limit=2&skip=2')
    .then(second => {
      t.equal(second.length, 2);
      t.notDeepEqual(first, second);
    });
  });
});

test('GET /words should orderBy if asked', (t) => {
  return wordCreator(15)
  .then(() => getJSON('/words?orderBy=name'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /words should orderBy asc if asked', (t) => {
  return wordCreator(15)
  .then(() => getJSON('/words?orderBy=name&order=asc'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /words should orderBy desc if asked', (t) => {
  return wordCreator(15)
  .then(() => getJSON('/words?orderBy=name&order=desc'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name < b.name) return 1;
      if (a.name > b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /words?count=true&limit=n should return n matching docs with a count of all matching docs ', (t) => {
  return wordCreator(10)
  .then(() => fetch(url+'/words?count=true&limit=5'))
  .then(res => res.json())
  .then(json => {
    t.equal(json.result.length, 5);
    t.ok(json.count);
    t.ok(json.count > 5);
  });
});

test('GET /words?limit=n should return n matching docs without a count of all matching docs ', (t) => {
  return wordCreator(10)
  .then(() => fetch(url+'/words?limit=5'))
  .then(res => res.json())
  .then(json => {
    t.equal(json.result.length, 5);
    t.ok(!json.count);
  });
});

test('GET /words?count=true&result=false should return only a count with no matching docs', (t) => {
  return wordCreator(10)
  .then(() => fetch(url+'/words?count=true&result=false'))
  .then(res => res.json())
  .then(json => {
    t.ok(!json.result, 'has no result');
    t.ok(json.count, 'has a count');
    t.ok(json.count > 5, 'count is greater than 5');
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

test('PUTing an updated word should actually persist it', (t) => {
  return singlewordCreator()
  .then(body => {
    body.name = 'Something else';
    return body
  })
  .then(body => putter('/words/'+body.id)(body))
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

test('opening a websocket connection to a word should return it', (t) => {
  return singlewordCreator()
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/words', {query: 'id='+body.id, forceNew: true});
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

test('opening a websocket connection to words should return all of them', (t) => {
  return wordCreator(2)
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/words', {forceNew: true});
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

test('opening a websocket connection to words should return changed documents', (t) => {
  return singlewordCreator()
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/words', {forceNew: true});
      io.on('state', data => {
        if (data.state === 'ready') {
          const target = _.assign({}, body, {name: 'ohai'});
          io.on('record', data => {
            t.deepEqual(data.new_val, target);
            t.notDeepEqual(data.new_val, body);
            io.disconnect();
            resolve();
          });
          putter('/words/'+body.id)(target)
        };
      });
    });
  });
});

test('websockets should accept the same filter params as GET requests', (t) => {
  wordCreator(2)
  .then(words => {
    const target = words[0];
    return new Promise(resolve => {
      const io = IO(url+'/words', {query: {name: target.name}, forceNew: true});
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
  wordCreator(2)
  .then(words => {
    return new Promise(resolve => {
      const io = IO(url+'/words', {query: {limit: 1}, forceNew: true});
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
