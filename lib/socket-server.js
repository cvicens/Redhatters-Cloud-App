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
var STOP_QUIZ_OK_MESSAGE = 'stop-quiz-ok';
var STOP_QUIZ_KO_MESSAGE = 'stop-quiz-ko';
var NEXT_QUESTION_MESSAGE = 'next-question';
var NEW_QUESTION_MESSAGE = 'new-question';
var LAST_QUESTION_MESSAGE = 'last-question';

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
        socket.on(NEXT_QUESTION_MESSAGE, function(data) {
            console.log('NEXT_QUESTION_MESSAGE', data);
            if (!data) {
                console.error ('NEXT_QUESTION_MESSAGE ERROR: Live quiz not found with data', JSON.stringify(data));
            }

            var eventId = data.eventId;
            var quizId = data.quizId;
            var liveQuizId = data.eventId + data.quizId;

            var currentQuiz = LIVE_QUIZZES[liveQuizId];
            console.log(JSON.stringify(currentQuiz));
            // if currentQuiz is an ok object...
            if (typeof currentQuiz !== 'undefined' && 
                typeof currentQuiz.currentQuestionIndex !== 'undefined' && 
                typeof currentQuiz.quiz !== 'undefined' && 
                Array.isArray(currentQuiz.quiz.questions)) {
                
                // If we haven't reached the end of the quiz...
                if (currentQuiz.currentQuestionIndex < currentQuiz.quiz.questions.length - 1) {
                    currentQuiz.currentQuestionIndex = currentQuiz.currentQuestionIndex >= (currentQuiz.quiz.questions.length - 1) ? 0 : currentQuiz.currentQuestionIndex + 1;
                    io.sockets.in('room').emit(NEW_QUESTION_MESSAGE, {
                        currentQuestionIndex: currentQuiz.currentQuestionIndex, 
                        question: currentQuiz.quiz.questions[currentQuiz.currentQuestionIndex]
                    });
                } else {
                    // We have reached the end...
                    console.error('Reached the end of the quiz, no more NEXT_QUESTION_MESSAGE allowed');
                    io.sockets.in('room').emit(LAST_QUESTION_MESSAGE, {
                        currentQuestionIndex: currentQuiz.currentQuestionIndex, 
                        question: currentQuiz.quiz.questions[currentQuiz.currentQuestionIndex]
                    });
                }
                
            } else {
                console.error ('NEXT_QUESTION_MESSAGE ERROR: Live quiz not found with liveQuizId', liveQuizId, ' or currentQuiz invalid', currentQuiz);
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
                    io.sockets.in('room').emit(START_QUIZ_OK_MESSAGE, {liveQuizId: liveQuizId, currentQuestionIndex: 0, 
                    question: quiz.questions[0]});
                } else {
                    console.error('START_QUIZ_MESSAGE ERROR: Quiz Id not found in DB eventId:', eventId, ' quizId:', quizId);
                }
            })
            .catch(function (err) {
                console.error('START_QUIZ_MESSAGE ERROR: ', err);
            });
        });

        // Stop quiz
        socket.on(STOP_QUIZ_MESSAGE, function(data) {
            console.log('STOP_QUIZ_MESSAGE', data);
            var eventId = data.eventId;
            var quizId = data.quizId;

            var liveQuizId = eventId + quizId;
            delete LIVE_QUIZZES[liveQuizId];

            io.sockets.in('room').emit(STOP_QUIZ_OK_MESSAGE, {liveQuizId: liveQuizId});
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