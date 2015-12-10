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
  if (!body.result && !body.found) {
    res.status(404);
    return Promise.resolve(res.json({err: 'Not found'}));
  }
  return Promise.resolve(res.json(body));
};

module.exports = {
  http: app => {
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

    app.put('/notes/:id', (req, res) => {
      note.update(req.body)
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });

    app.del('/notes/:id', (req, res) => {
      note.delete(req.params.id)
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });
  },
  ws: io => {
    const nsp = io.of('/notes');
    nsp.on('connection', socket => {
      note.watch(socket.handshake.query)
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
