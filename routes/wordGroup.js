const _ = require('lodash');
const wordGroup = require('../controllers/wordGroup.js');

const errHandlerFactory = res => {
  return err => {
    console.error('route error', err.message);
    res.status(500);
    res.json(err);
  }
};

const respond = res => body => {
  if (!body.result && !body.found) {
    res.status(404);
    return Promise.resolve(res.json({err: 'Not found'}));
  }
  return Promise.resolve(res.json(body));
};

module.exports = {
  http: app => {
    app.get('/wordGroups', (req, res) => {
      wordGroup.get(req.query)
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });

    app.get('/wordGroups/:id', (req, res) => {
      wordGroup.get(_.assign({id: req.params.id}, req.query))
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });

    app.post('/wordGroups', (req, res) => {
      wordGroup.create(req.body)
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });

    app.put('/wordGroups/:id', (req, res) => {
      wordGroup.update(req.body)
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });

    app.del('/wordGroups/:id', (req, res) => {
      wordGroup.delete(req.params.id)
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });
  },
  ws: io => {
    const nsp = io.of('/wordGroups');
    nsp.on('connection', socket => {
      wordGroup.watch(socket.handshake.query)
      .then(cursor => {
        cursor.each((err, data) => {
          if (!data) return;
          if (data.state) return socket.emit('state', data);
          socket.emit('record', data);
        });
      });
    });
  }
};
