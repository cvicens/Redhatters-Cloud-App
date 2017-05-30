var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

var quizzes = require('./quizzes.js');

var LIVE_QUIZZES = {};
var USERS = [];

var START_QUIZ_MESSAGE = 'start-quiz';
var START_QUIZ_OK_MESSAGE = 'start-quiz-ok';
var START_QUIZ_KO_MESSAGE = 'start-quiz-ko';
var STOP_QUIZ_MESSAGE = 'stop-quiz';
var NEXT_QUESTION_MESSAGE = 'next-question';
var NEW_QUESTION_MESSAGE = 'new-question';

var io = null;

function init(server) {
    if (!server) {
        console.error('No server was passed!');
        return;
    }

    io = require('socket.io').listen(server);
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
        });

        // Add a new question
        socket.on(NEXT_QUESTION_MESSAGE, function(tempQuizId) {
            var currentQuiz = LIVE_QUIZZES[quizId];
            if (currentQuiz) {
                var currentQuestionIndex = currentQuiz.currentQuestionIndex;
                var question = currentQuiz.questions[currentQuiz.currentQuestionIndex];

                io.sockets.in('room').emit(NEW_QUESTION_MESSAGE, question);
                //console.log('data=' + JSON.stringify(message));
            }

        });

        // Start quiz
        socket.on(START_QUIZ_MESSAGE, function(data) {
            console.log('START_QUIZ_MESSAGE', data);
            var eventId = data.eventId;
            var quizId = data.quizId;

            var liveQuizId = eventId + quizId;
            quizzes.readQuiz(quizId).
            then(function (quiz) {
                if (quiz) {
                    LIVE_QUIZZES[liveQuizId] = {
                        currentQuestionIndex: 0,
                        quiz: quiz
                    };
                    io.sockets.in('room').emit(START_QUIZ_OK_MESSAGE, {liveQuizId: liveQuizId});
                } else {
                    console.error('Quiz Id not found');
                }
            })
            .catch(function (err) {
                console.error('START_QUIZ_MESSAGE ERROR: ', err);
            });
            

        });

        // Broadcast messages to all clients
        socket.on('message', function(data) {
            var message = {
                data: data
            };
            io.sockets.in('room').emit('message', message);
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

    router.get('/quiz', function(req, res) {
        var eventId = req.query.eventId;
        var quizId = req.query.quizId;
        console.log('eventId', eventId, 'quizId', quizId);
        if (typeof eventId === 'undefined' || eventId === '' ||
            typeof quizId === 'undefined' || quizId === '') {
            res.status(404).json([]);
        return;
        }

        var liveQuizId = eventId + quizId;
        var liveQuiz = LIVE_QUIZZES[liveQuizId];
        
        if (liveQuiz) {
            res.status(200).json(liveQuiz);
        }
        else {
            res.status(500).json({result:'ERROR', msg: 'NO LIVE QUIZ FOUND FOR eventId: ' + eventId + ' quizId: ' + quizId})
        };
    });

    return router;
}

module.exports.init = init;
module.exports.route = route;