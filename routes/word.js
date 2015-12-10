const _ = require('lodash');
const word = require('../controllers/word.js');

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
    app.get('/words', (req, res) => {
      word.get(req.query)
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });

    app.get('/words/:id', (req, res) => {
      word.get(_.assign({id: req.params.id}, req.query))
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });

    app.post('/words', (req, res) => {
      word.create(req.body)
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });

    app.put('/words/:id', (req, res) => {
      word.update(req.body)
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });

    app.del('/words/:id', (req, res) => {
      word.delete(req.params.id)
      .then(respond(res))
      .catch( errHandlerFactory(res) )
    });
  },
  ws: io => {
    const nsp = io.of('/words');
    nsp.on('connection', socket => {
      word.watch(socket.handshake.query)
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
