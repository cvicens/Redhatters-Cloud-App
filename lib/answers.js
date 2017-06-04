var $fh = require('fh-mbaas-api');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

var quizzes = require('./quizzes.js');

var db = require('./db-store');

var ANSWERS_SERVICE_GUID = process.env.ANSWERS_SERVICE_GUID;
var ANSWERS_COLLECTION_NAME = process.env.ANSWERS_COLLECTION_NAME || "answers";
var MOCKED_UP = process.env.MOCKED_UP || "true";

function _searchAnswersMockedUp (filter) {
  return new Promise(function(resolve, reject) {
    db.list(ANSWERS_COLLECTION_NAME, filter, function (err, data) {
      if (err) {
        reject({result:'ERROR', msg: err});
      } else {
        resolve(data);
      }
    });
  });
}

function _searchAnswers(filter) {
  return new Promise(function(resolve, reject) {
    var path = '/answers';
    console.log('path: ' + path);

    $fh.service({
      "guid" : ANSWERS_SERVICE_GUID, // The 24 character unique id of the service
      "path": path, //the path part of the url excluding the hostname - this will be added automatically
      "method": "POST",   //all other HTTP methods are supported as well. e.g. HEAD, DELETE, OPTIONS
      "timeout": 25000, // timeout value specified in milliseconds. Default: 60000 (60s)
      "params": filter,
      //"headers" : {
        // Custom headers to add to the request. These will be appended to the default headers.
      //}
    }, function(err, body, response) {
      console.log('statuscode: ', response && response.statusCode);
      if (err) {
        // An error occurred during the call to the service. log some debugging information
        console.log(path + ' service call failed - err : ', err);
        reject({result:'ERROR', msg: err});
      } else {
        resolve(body);
      }
    });
  });
}

function searchAnswers(filter) {
  console.log('MOCKED_UP', MOCKED_UP);
  if (MOCKED_UP === 'true') {
    console.log('_searchAnswersMockedUp');
    return _searchAnswersMockedUp(filter);
  } else {
    console.log('_searchAnswers');
    return _searchAnswers(filter);
  }
}

function _persistAnswerMockedUp (answer) {
  return new Promise(function(resolve, reject) {
    db.update(ANSWERS_COLLECTION_NAME, answer, function (err, data) {
      if (err) {
        reject({result:'ERROR', msg: err})
      } else {
        resolve(data);
      }
    }, false);
  });
}

function _persistAnswer(answer) {
  return new Promise(function(resolve, reject) {
    var path = '/answers';
    console.log('path: ' + path);

    $fh.service({
      "guid" : ANSWERS_SERVICE_GUID, // The 24 character unique id of the service
      "path": path, //the path part of the url excluding the hostname - this will be added automatically
      "method": "POST",   //all other HTTP methods are supported as well. e.g. HEAD, DELETE, OPTIONS
      "timeout": 25000, // timeout value specified in milliseconds. Default: 60000 (60s)
      "params": answer,
      //"headers" : {
        // Custom headers to add to the request. These will be appended to the default headers.
      //}
    }, function(err, body, response) {
      console.log('statuscode: ', response && response.statusCode);
      if (err) {
        // An error occurred during the call to the service. log some debugging information
        console.log(path + ' service call failed - err : ', err);
        reject({result:'ERROR', msg: err});
      } else {
        resolve(body);
      }
    });
  });
}

function persistAnswer(answer) {
  console.log('MOCKED_UP', MOCKED_UP);
  if (MOCKED_UP === 'true') {
    console.log('_persistAnswerMockedUp');
    return _persistAnswerMockedUp(answer);
  } else {
    console.log('_persistAnswer');
    return _persistAnswer(answer);
  }
}

function getQuestionByQuizIdAndQuestionIdx (quizId, questionIdx) {
  return new Promise(function(resolve, reject) {
    quizzes.readQuiz(quizId)
    .then(function(quiz) {
      if (Array.isArray(quiz.questions) && typeof quiz.questions[questionIdx] === 'object') {
        resolve(quiz.questions[questionIdx]);  
      } else {
        resolve(null);
      }
    })
    .catch(function (err){
      reject(err);
    });
  });
  
}

function getFormattedTime(date) {
  return ('0' + date.getHours()).slice(-2) + ':' + ('0' + (date.getMinutes()+1)).slice(-2);
}

function getFormattedDate(date) {
  //return ('0' + date.getDate()).slice(-2) + '/' + ('0' + (date.getMonth()+1)).slice(-2) + '/' + date.getFullYear();
  return  date.getFullYear() + ('0' + (date.getMonth()+1)).slice(-2) + ('0' + date.getDate()).slice(-2);
}

function route() {
  var router = new express.Router();
  router.use(cors());
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));

  router.post('/', function(req, res) {
    var answer = req.body;
    console.log('answer: ' + JSON.stringify(answer));
    if (typeof answer === 'undefined') {
      res.status(404).json([]);
      return;
    }

    // Let's add a timestamp
    //answer.timestamp = (new Date()).toISOString(); 
    
    // Let's add a date so that we can only have 1 record per question, username and date
    answer.date = getFormattedDate(new Date);
    
    getQuestionByQuizIdAndQuestionIdx(answer.quizId, answer.question)
    .then(function (question) {
      answer.result = answer.answer == question.answers[0] ? 'CORRECT' : 'WRONG';
      return persistAnswer(answer);
    })
    .then(function (data) {
      res.status(200).json(data);
    })
    .catch (function (err) {
      res.status(500).json({result:'ERROR', msg: err});
      return;
    });
     
  });

  router.post('/search', function(req, res) {
    var filter = req.body;
    console.log('filter: ' + filter);
    if (typeof filter === 'undefined') {
      res.status(404).json([]);
      return;
    }

    searchAnswers(filter).
    then(function (data) {
      res.status(200).json(data);
    })
    .catch(function (err) {
      res.status(500).json({result:'ERROR', msg: err})
    });
  });

  return router;
}

module.exports = route;
