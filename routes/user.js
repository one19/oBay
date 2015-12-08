const _ = require('lodash');
const user = require('../controllers/user.js');

const errHandlerFactory = res => {
  return err => {
    console.error('route error', err.message);
    res.status(500);
    res.json(err);
  }
};

const respond = res => body => {
  if (!body.result || (Array.isArray(body.result) && body.result.length === 0)) {
    res.status(404);
    return Promise.resolve(res.json({err: 'Not found'}));
  }
  return Promise.resolve(res.json(body));
};

module.exports = app => {
  app.get('/users', (req, res) => {
    user.get(req.query)
    .then(respond(res))
    .catch( errHandlerFactory(res) )
  });

  app.get('/users/:id', (req, res) => {
    user.get(_.assign({id: req.params.id}, req.query))
    .then(respond(res))
    .catch( errHandlerFactory(res) )
  });

  app.post('/users', (req, res) => {
    user.create(req.body)
    .then(respond(res))
    .catch( errHandlerFactory(res) )
  });

  app.post('/users/:id', (req, res) => {
    user.update(req.body)
    .then(respond(res))
    .catch( errHandlerFactory(res) )
  });

  app.del('/users/:id', (req, res) => {
    user.delete(req.params.id)
    .then(respond(res))
    .catch( errHandlerFactory(res) )
  });
};
