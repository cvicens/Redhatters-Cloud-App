function init(server) {
    // Socket.io setup

    //var io = require('socket.io')(server);
    var io = require('socket.io').listen(server);
    io.set('log level', 1);

    var liveQuizzes = {};
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
}

module.exports.init = init;