const test = require('blue-tape');
const fetch = require('node-fetch');
const _ = require('lodash');
const fixture = require('../fixtures/wordGroup');
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

const wordGroupPoster = poster('/wordGroups')

const wordGroupCreator = times => {
  return Promise.all(_.times(times, () => {
    const data = fixture.valid();
    return wordGroupPoster(data)
    .then(unwrapJSON)
  }));
};

const pop = data => data[0];

const singlewordGroupCreator = () => wordGroupCreator(1).then(pop);

test('POSTing a valid sprint should return 200', (t) => {
  const wordGroup = fixture.valid();
  return wordGroupPoster(wordGroup)
  .then(assertOk(t));
});

test('GET /wordGroups/:id should return 200', (t) => {
  return singlewordGroupCreator()
  .then(body => fetch(url+'/wordGroups/'+body.id))
  .then(assertOk(t));
});

test('GET /wordGroups should return 200', (t) => {
  return singlewordGroupCreator()
  .then(() => fetch(url+'/wordGroups'))
  .then(assertOk(t));
});

test('GET /wordGroups should return an object with a .result property', (t) => {
  return singlewordGroupCreator()
  .then(() => fetch(url+'/wordGroups'))
  .then(res => res.json())
  .then(json => {
    t.equal(typeof json, 'object');
    t.ok(json.result);
  });
});

test('GET /wordGroups should accept search params in the querystring', (t) => {
  return wordGroupCreator(2)
  .then(wordGroups => {
    return getJSON('/wordGroups?name='+wordGroups[0].name)
    .then(json => {
      t.equal(json.length, 1);
      t.equal(json[0].name, wordGroups[0].name);
    });
  });
});

test('GET /wordGroups should not match non-property search params in the querystring', (t) => {
  return wordGroupCreator(2)
  .then(wordGroups => {
    return getJSON('/wordGroups?foo='+wordGroups[0].name)
    .then(json => {
      t.ok(json.length > 1);
    });
  });
});

test('GET /wordGroups should return an array', (t) => {
  return singlewordGroupCreator()
  .then(() => getJSON('/wordGroups'))
  .then(json => {
    t.ok(Array.isArray(json));
  });
});

test('GET /wordGroups should paginate if asked', (t) => {
  return wordGroupCreator(5)
  .then(() => getJSON('/wordGroups?limit=2'))
  .then(json => {
    t.equal(json.length, 2);
  });
});

test('GET /wordGroups should skip if asked', (t) => {
  return wordGroupCreator(5)
  .then(() => getJSON('/wordGroups?limit=2'))
  .then(first => {
    t.equal(first.length, 2);
    return getJSON('/wordGroups?limit=2&skip=2')
    .then(second => {
      t.equal(second.length, 2);
      t.notDeepEqual(first, second);
    });
  });
});

test('GET /wordGroups should orderBy if asked', (t) => {
  return wordGroupCreator(15)
  .then(() => getJSON('/wordGroups?orderBy=name'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /wordGroups should orderBy asc if asked', (t) => {
  return wordGroupCreator(15)
  .then(() => getJSON('/wordGroups?orderBy=name&order=asc'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /wordGroups should orderBy desc if asked', (t) => {
  return wordGroupCreator(15)
  .then(() => getJSON('/wordGroups?orderBy=name&order=desc'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name < b.name) return 1;
      if (a.name > b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /wordGroups?count=true&limit=n should return n matching docs with a count of all matching docs ', (t) => {
  return wordGroupCreator(10)
  .then(() => fetch(url+'/wordGroups?count=true&limit=5'))
  .then(res => res.json())
  .then(json => {
    t.equal(json.result.length, 5);
    t.ok(json.count);
    t.ok(json.count > 5);
  });
});

test('GET /wordGroups?limit=n should return n matching docs without a count of all matching docs ', (t) => {
  return wordGroupCreator(10)
  .then(() => fetch(url+'/wordGroups?limit=5'))
  .then(res => res.json())
  .then(json => {
    t.equal(json.result.length, 5);
    t.ok(!json.count);
  });
});

test('GET /wordGroups?count=true&result=false should return only a count with no matching docs', (t) => {
  return wordGroupCreator(10)
  .then(() => fetch(url+'/wordGroups?count=true&result=false'))
  .then(res => res.json())
  .then(json => {
    t.ok(!json.result, 'has no result');
    t.ok(json.count, 'has a count');
    t.ok(json.count > 5, 'count is greater than 5');
  });
});


test('POSTing a valid wordGroup should actually persist it', (t) => {
  return singlewordGroupCreator()
  .then(spec => {
    return getJSON('/wordGroups/'+spec.id)
    .then((json) => {
      t.equal(json.name, spec.name);
    });
  });
});

test('PUTing an updated wordGroup should actually persist it', (t) => {
  return singlewordGroupCreator()
  .then(body => {
    body.name = 'Something else';
    return body
  })
  .then(body => putter('/wordGroups/'+body.id)(body))
  .then(unwrapJSON)
  .then(body => getJSON('/wordGroups/'+body.id))
  .then((json) => {
    t.equal(json.name, 'Something else');
  });
});

test('DELETEing a wordGroup should return 200', (t) => {
  return singlewordGroupCreator()
  .then(body => deleter('/wordGroups/'+body.id)())
  .then(assertOk(t));
});

test('DELETEing a wordGroup should actually delete it', (t) => {
  return singlewordGroupCreator()
  .then(body => deleter('/wordGroups/'+body.id)())
  .then(unwrapOldVal)
  .then(body => fetch(url+'/wordGroups/'+body.id))
  .then(res => {
    t.equal(res.status, 404);
  });
});

test('opening a websocket connection to a wordGroup should return it', (t) => {
  return singlewordGroupCreator()
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/wordGroups', {query: 'id='+body.id, forceNew: true});
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

test('opening a websocket connection to wordGroups should return all of them', (t) => {
  return wordGroupCreator(2)
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/wordGroups', {forceNew: true});
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

test('opening a websocket connection to wordGroups should return changed documents', (t) => {
  return singlewordGroupCreator()
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/wordGroups', {forceNew: true});
      io.on('state', data => {
        if (data.state === 'ready') {
          const target = _.assign({}, body, {name: 'ohai'});
          io.on('record', data => {
            t.deepEqual(data.new_val, target);
            t.notDeepEqual(data.new_val, body);
            io.disconnect();
            resolve();
          });
          putter('/wordGroups/'+body.id)(target)
        };
      });
    });
  });
});

test('websockets should accept the same filter params as GET requests', (t) => {
  wordGroupCreator(2)
  .then(wordGroups => {
    const target = wordGroups[0];
    return new Promise(resolve => {
      const io = IO(url+'/wordGroups', {query: {name: target.name}, forceNew: true});
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
  wordGroupCreator(2)
  .then(wordGroups => {
    return new Promise(resolve => {
      const io = IO(url+'/wordGroups', {query: {limit: 1}, forceNew: true});
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
