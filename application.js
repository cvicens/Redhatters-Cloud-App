var mbaasApi = require('fh-mbaas-api');
var express = require('express');
var mbaasExpress = mbaasApi.mbaasExpress();
var cors = require('cors');

// list the endpoints which you want to make securable here
var securableEndpoints;
securableEndpoints = ['/hello'];

var app = express();



// Enable CORS for all requests
app.use(cors());

// Note: the order which we add middleware to Express here is important!
app.use('/sys', mbaasExpress.sys(securableEndpoints));
app.use('/mbaas', mbaasExpress.mbaas);

/* uncomment this code if you want to use $fh.auth in the app preview
 * localAuth is only used for local development. 
 * If the app is deployed on the platform, 
 * this function will be ignored and the request will be forwarded 
 * to the platform to perform authentication.

app.use('/box', mbaasExpress.auth({localAuth: function(req, cb){
  return cb(null, {status:401, body: {"message": "bad request"}});
}}));

or

app.use('/box', mbaasExpress.core({localAuth: {status:401, body: {"message": "not authorised”}}}));
*/

// allow serving of static files from the public directory
app.use(express.static(__dirname + '/public'));

// Note: important that this is added just before your own Routes
app.use(mbaasExpress.fhmiddleware());

app.use('/hello', require('./lib/hello.js')());
app.use('/login', require('./lib/login.js')());
app.use('/events', require('./lib/events.js')());
app.use('/quizzes', require('./lib/quizzes.js')());

// Important that this is last!
app.use(mbaasExpress.errorHandler());

var port = process.env.FH_PORT || process.env.OPENSHIFT_NODEJS_PORT || 8001;
var host = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
var server = app.listen(port, host, function() {
  console.log("App started at: " + new Date() + " on port: " + port); 
});

//var io = require('socket.io')(server);
var io = require('socket.io').listen(server);
io.set('log level', 1);

var users = [];

var updateUserList = function() {
  io.sockets.in('room').emit('userlist', {
    "users": users
  });
};

// Handler new users connecting
io.sockets.on('connection', function(socket) {

  // save user to user list
 var userObj = {
    "socketId": socket.id,
  };
  users.push(userObj);

  // let user know their info
  socket.emit('user', userObj);

  // join user to room
  socket.join('room');

  // let everyone know update to user list
  updateUserList();

  // Broadcast messages to all clients
  socket.on('add-message', function(data) {
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
    users.splice(users.indexOf(userObj), 1);

    // let everyone know update to user list
    updateUserList();

    var message = socket.id + ' disconnected';
    //console.log(message);
  });
});
