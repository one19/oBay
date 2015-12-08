const _ = require('lodash');
const note = require('../controllers/note.js');

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
  app.get('/notes', (req, res) => {
    note.get(req.query)
    .then(respond(res))
    .catch( errHandlerFactory(res) )
  });

  app.get('/notes/:id', (req, res) => {
    note.get(_.assign({id: req.params.id}, req.query))
    .then(respond(res))
    .catch( errHandlerFactory(res) )
  });

  app.post('/notes', (req, res) => {
    note.create(req.body)
    .then(respond(res))
    .catch( errHandlerFactory(res) )
  });

  app.post('/notes/:id', (req, res) => {
    note.update(req.body)
    .then(respond(res))
    .catch( errHandlerFactory(res) )
  });

  app.del('/notes/:id', (req, res) => {
    note.delete(req.params.id)
    .then(respond(res))
    .catch( errHandlerFactory(res) )
  });
};
