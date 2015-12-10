const test = require('blue-tape');
const fetch = require('node-fetch');
const _ = require('lodash');
const fixture = require('../fixtures/user');
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

const userPoster = poster('/users')

const userCreator = times => {
  return Promise.all(_.times(times, () => {
    const data = fixture.valid();
    return userPoster(data)
    .then(unwrapJSON)
  }));
};

const pop = data => data[0];

const singleuserCreator = () => userCreator(1).then(pop);

test('POSTing a valid sprint should return 200', (t) => {
  const user = fixture.valid();
  return userPoster(user)
  .then(assertOk(t));
});

test('GET /users/:id should return 200', (t) => {
  return singleuserCreator()
  .then(body => fetch(url+'/users/'+body.id))
  .then(assertOk(t));
});

test('GET /users should return 200', (t) => {
  return singleuserCreator()
  .then(() => fetch(url+'/users'))
  .then(assertOk(t));
});

test('GET /users should return an object with a .result property', (t) => {
  return singleuserCreator()
  .then(() => fetch(url+'/users'))
  .then(res => res.json())
  .then(json => {
    t.equal(typeof json, 'object');
    t.ok(json.result);
  });
});

test('GET /users should accept search params in the querystring', (t) => {
  return userCreator(2)
  .then(users => {
    return getJSON('/users?name='+users[0].name)
    .then(json => {
      t.equal(json.length, 1);
      t.equal(json[0].name, users[0].name);
    });
  });
});

test('GET /users should not match non-property search params in the querystring', (t) => {
  return userCreator(2)
  .then(users => {
    return getJSON('/users?foo='+users[0].name)
    .then(json => {
      t.ok(json.length > 1);
    });
  });
});

test('GET /users should return an array', (t) => {
  return singleuserCreator()
  .then(() => getJSON('/users'))
  .then(json => {
    t.ok(Array.isArray(json));
  });
});

test('GET /users should paginate if asked', (t) => {
  return userCreator(5)
  .then(() => getJSON('/users?limit=2'))
  .then(json => {
    t.equal(json.length, 2);
  });
});

test('GET /users should skip if asked', (t) => {
  return userCreator(5)
  .then(() => getJSON('/users?limit=2'))
  .then(first => {
    t.equal(first.length, 2);
    return getJSON('/users?limit=2&skip=2')
    .then(second => {
      t.equal(second.length, 2);
      t.notDeepEqual(first, second);
    });
  });
});

test('GET /users should orderBy if asked', (t) => {
  return userCreator(15)
  .then(() => getJSON('/users?orderBy=name'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /users should orderBy asc if asked', (t) => {
  return userCreator(15)
  .then(() => getJSON('/users?orderBy=name&order=asc'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /users should orderBy desc if asked', (t) => {
  return userCreator(15)
  .then(() => getJSON('/users?orderBy=name&order=desc'))
  .then(results => {
    const reordered = _.clone(results).sort((a, b) => {
      if (a.name < b.name) return 1;
      if (a.name > b.name) return -1;
      return 0;
    });
    t.deepEqual(_.pluck(reordered, 'name'), _.pluck(results, 'name'));
  });
});

test('GET /users?count=true&limit=n should return n matching docs with a count of all matching docs ', (t) => {
  return userCreator(10)
  .then(() => fetch(url+'/users?count=true&limit=5'))
  .then(res => res.json())
  .then(json => {
    t.equal(json.result.length, 5);
    t.ok(json.count);
    t.ok(json.count > 5);
  });
});

test('GET /users?limit=n should return n matching docs without a count of all matching docs ', (t) => {
  return userCreator(10)
  .then(() => fetch(url+'/users?limit=5'))
  .then(res => res.json())
  .then(json => {
    t.equal(json.result.length, 5);
    t.ok(!json.count);
  });
});

test('GET /users?count=true&result=false should return only a count with no matching docs', (t) => {
  return userCreator(10)
  .then(() => fetch(url+'/users?count=true&result=false'))
  .then(res => res.json())
  .then(json => {
    t.ok(!json.result, 'has no result');
    t.ok(json.count, 'has a count');
    t.ok(json.count > 5, 'count is greater than 5');
  });
});


test('POSTing a valid user should actually persist it', (t) => {
  return singleuserCreator()
  .then(spec => {
    return getJSON('/users/'+spec.id)
    .then((json) => {
      t.equal(json.name, spec.name);
    });
  });
});

test('PUTing an updated user should actually persist it', (t) => {
  return singleuserCreator()
  .then(body => {
    body.name = 'Something else';
    return body
  })
  .then(body => putter('/users/'+body.id)(body))
  .then(unwrapJSON)
  .then(body => getJSON('/users/'+body.id))
  .then((json) => {
    t.equal(json.name, 'Something else');
  });
});

test('DELETEing a user should return 200', (t) => {
  return singleuserCreator()
  .then(body => deleter('/users/'+body.id)())
  .then(assertOk(t));
});

test('DELETEing a user should actually delete it', (t) => {
  return singleuserCreator()
  .then(body => deleter('/users/'+body.id)())
  .then(unwrapOldVal)
  .then(body => fetch(url+'/users/'+body.id))
  .then(res => {
    t.equal(res.status, 404);
  });
});

test('opening a websocket connection to a user should return it', (t) => {
  return singleuserCreator()
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/users', {query: 'id='+body.id, forceNew: true});
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

test('opening a websocket connection to users should return all of them', (t) => {
  return userCreator(2)
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/users', {forceNew: true});
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

test('opening a websocket connection to users should return changed documents', (t) => {
  return singleuserCreator()
  .then(body => {
    return new Promise(resolve => {
      const io = IO(url+'/users', {forceNew: true});
      io.on('state', data => {
        if (data.state === 'ready') {
          const target = _.assign({}, body, {name: 'ohai'});
          io.on('record', data => {
            t.deepEqual(data.new_val, target);
            t.notDeepEqual(data.new_val, body);
            io.disconnect();
            resolve();
          });
          putter('/users/'+body.id)(target)
        };
      });
    });
  });
});

test('websockets should accept the same filter params as GET requests', (t) => {
  userCreator(2)
  .then(users => {
    const target = users[0];
    return new Promise(resolve => {
      const io = IO(url+'/users', {query: {name: target.name}, forceNew: true});
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
  userCreator(2)
  .then(users => {
    return new Promise(resolve => {
      const io = IO(url+'/users', {query: {limit: 1}, forceNew: true});
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
