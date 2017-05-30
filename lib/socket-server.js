var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var io = require('socket.io');

var LIVE_QUIZZES = {};
var USERS = [];

function init(server) {
    if (!server) {
        console.error('No server was passed!');
        return;
    }

    io.listen(server);
    io.set('log level', 1);

    var updateUserList = function() {
        io.sockets.in('room').emit('userlist', {
            "USERS": USERS
        });
    };

    // Handler new USERS connecting
    io.sockets.on('connection', function(socket) {
        // save user to user list
        var userObj = {
            "socketId": socket.id,
        };
        USERS.push(userObj);

        // let user know their info
        socket.emit('user', userObj);

        // join user to room
        socket.join('room');

        // let everyone know update to user list
        updateUserList();

        // Add a new question
        socket.on('add-question', function(data) {
            var message = {
            data: data
            };
            io.sockets.in('room').emit('question', message);
            //console.log('data=' + JSON.stringify(message));
        });

        // Broadcast messages to all clients
        socket.on('message', function(data) {
            var message = {
            data: data
            };
            io.sockets.in('room').emit('message', message);
            //console.log('data=' + JSON.stringify(message));
        });

        // If user disconnects
        socket.on('disconnect', function() {
            // update user list
            USERS.splice(USERS.indexOf(userObj), 1);

            // let everyone know update to user list
            updateUserList();

            var message = socket.id + ' disconnected';
            //console.log(message);
        });
    });
}

function route() {
  var router = new express.Router();
  router.use(cors());
  router.use(bodyParser());


  // GET REST endpoint - query params may or may not be populated
  router.get('/', function(req, res) {
    console.log(new Date(), 'In hello route GET / req.query=', req.query);
    var world = req.query && req.query.hello ? req.query.hello : 'World';

    // see http://expressjs.com/4x/api.html#res.json
    res.json({msg: 'Hello ' + world});
  });

  // POST REST endpoint - note we use 'body-parser' middleware above to parse the request body in this route.
  // This can also be added in application.js
  // See: https://github.com/senchalabs/connect#middleware for a list of Express 4 middleware
  router.post('/', function(req, res) {
    console.log(new Date(), 'In hello route POST / req.body=', req.body);
    var world = req.body && req.body.hello ? req.body.hello : 'World';

    // see http://expressjs.com/4x/api.html#res.json
    res.json({msg: 'Hello ' + world});
  });

  return router;
}

module.exports.init = init;