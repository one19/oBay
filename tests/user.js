const test = require('blue-tape');
const fetch = require('node-fetch');
const _ = require('lodash');
const fixture = require('../fixtures/user');

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

test('POSTing a valid user should actually persist it', (t) => {
  return singleuserCreator()
  .then(spec => {
    return getJSON('/users/'+spec.id)
    .then((json) => {
      t.equal(json.name, spec.name);
    });
  });
});

test('POSTing an updated user should actually persist it', (t) => {
  return singleuserCreator()
  .then(body => {
    body.name = 'Something else';
    return body
  })
  .then(body => poster('/users/'+body.id)(body))
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
