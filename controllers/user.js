const jsen = require('jsen');
const _ = require('lodash');

const db = require('../lib/db.js');
const schema = require('../schemas/user.json');
const validate = jsen(schema);

const firstChange = res => {
  return {
    result: res.changes[0].new_val || res.changes[0],
    old_val: res.changes[0].old_val
  }
}

const properties = Object.keys(schema.properties);

const onlyProps = params => (p, prop) => {
  p[prop] = params[prop];
  return p
}

const stringToBool = params => {
  return Object.keys(params).reduce((p, k) => {
    const param = params[k];
    switch (param) {
      case 'true':
        p[k] = true;
        break;
      case 'false':
        p[k] = false;
        break;
      default:
        p[k] = param;
    }
    return p;
  }, {});
}

const stringToNumber = params => {
  return Object.keys(params).reduce((p, k) => {
    const param = params[k];
    const num = Number(param);
    p[k] = param;
    if (!isNaN(num)) p[k] = num;
    return p;
  }, {});
}

const normaliseParams = params => {
  return stringToBool(stringToNumber(params));
}

module.exports = {
  get: (params) => {
    const table = db.table('users');

    if (params.id) {
      return table.get(params.id).run()
      .then(res => { return {result: res} });
    }

    params = _.assign({result: true, order: 'asc'}, normaliseParams(params));

    const filterParams = properties.reduce(onlyProps(params), {});
    const filteredTable = table.filter(filterParams);

    const query = ['orderBy', 'skip', 'limit'].reduce((q, item) => {
      if (params[item]) {
        if (item === 'orderBy') {
          q = q[item](db[params.order](params[item]));
        } else {
          q = q[item](params[item]);
        }
      }
      return q;
    }, filteredTable);

    const taggedQueries = [
      {tag: 'result', q: query},
      {tag: 'count', q: filteredTable.count()}
    ].filter(x => params[x.tag]);

    return Promise.all(taggedQueries.map(x => x.q.run()))
    .then(results => {
      return results.reduce((response, result, i) => {
        const tag = taggedQueries[i].tag;
        response[tag] = result;
        if (tag === 'count' && result > 0) response.found = true;
        if (tag === 'response' && result.length > 0) response.found = true;
        return response;
      }, {found: false});
    });
  },
  watch: (params) => {
    const table = db.table('users');
    if (params && params.id) {
      return table.get(params.id).changes({includeInitial: true, includeStates: true}).run();
    }

    params = normaliseParams(params);

    const filterParams = properties.reduce(onlyProps(params), {});

    const query = ['limit'].reduce((q, item) => {
      if (params[item]) q = q[item](params[item]);
      return q;
    }, table.orderBy({index: 'id'}).filter(filterParams));

    return query.changes({includeInitial: true, includeStates: true}).run();
  },
  create: (user) => {
    const valid = validate(user);
    if (!valid) return Promise.reject(valid);
    return db.table('users').insert(user, {returnChanges: true}).run()
    .then(firstChange);
  },
  update: (user) => {
    const valid = validate(user);
    if (!valid) return Promise.reject(valid);
    return db.table('users').update(user, {returnChanges: true}).run()
    .then(firstChange);
  },
  delete: (id) => {
    return db.table('users').get(id).delete({returnChanges: true}).run()
    .then(res => {
      return res;
    })
    .then(firstChange);
  }
};
