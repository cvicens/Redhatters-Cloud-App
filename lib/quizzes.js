var $fh = require('fh-mbaas-api');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

var db = require('./db-store');

var QUIZZES_SERVICE_GUID = process.env.QUIZZES_SERVICE_GUID;
var QUIZZES_COLLECTION_NAME = process.env.QUIZZES_COLLECTION_NAME || "quizzes";
var MOCKED_UP = process.env.MOCKED_UP || "true";

function _searchQuizzesMockedUp (filter) {
  return new Promise(function(resolve, reject) {
    db.list(QUIZZES_COLLECTION_NAME, filter, function (err, data) {
      if (err) {
        reject({result:'ERROR', msg: err});
      } else {
        resolve(data);
      }
    });
  });
}

function _searchQuizzes(filter) {
  return new Promise(function(resolve, reject) {
    var path = '/quizzes';
    console.log('path: ' + path);

    $fh.service({
      "guid" : QUIZZES_SERVICE_GUID, // The 24 character unique id of the service
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

function searchQuizzes(filter) {
  console.log('searchQuizzes MOCKED_UP', MOCKED_UP);
  if (MOCKED_UP === 'true') {
    console.log('_searchQuizzesMockedUp');
    return _searchQuizzesMockedUp(filter);
  } else {
    console.log('_searchQuizzes');
    return _searchQuizzes(filter);
  }
}

function _readQuizMockedUp (id) {
  return new Promise(function(resolve, reject) {
    db.read(QUIZZES_COLLECTION_NAME, id, function (err, data) {
      if (err) {
        reject({result:'ERROR', msg: err});
      } else {
        resolve(data);
      }
    });
  });
}

function _readQuiz(id) {
  return new Promise(function(resolve, reject) {
    var path = '/quizzes';
    console.log('path: ' + path);

    $fh.service({
      "guid" : QUIZZES_SERVICE_GUID, // The 24 character unique id of the service
      "path": path, //the path part of the url excluding the hostname - this will be added automatically
      "method": "GET",   //all other HTTP methods are supported as well. e.g. HEAD, DELETE, OPTIONS
      "timeout": 25000, // timeout value specified in milliseconds. Default: 60000 (60s)
      "params": { id: id},
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

function readQuiz(id) {
  console.log('readQuizz MOCKED_UP', MOCKED_UP);
  if (MOCKED_UP === 'true') {
    console.log('_readQuizzMockedUp');
    return _readQuizMockedUp(id);
  } else {
    console.log('_readQuizz');
    return _readQuiz(id);
  }
}

function route() {
  var router = new express.Router();
  router.use(cors());
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));

  router.get('/', function(req, res) {
    var id = req.query.id;
    console.log('id ' + id);
    if (typeof id === 'undefined' || id === '') {
      res.status(404).json([]);
      return;
    }

    readQuizz(id).
    then(function (data) {
      res.status(200).json(data);
    })
    .catch(function (err) {
      res.status(500).json({result:'ERROR', msg: err})
    });
  });

  router.post('/', function(req, res) {
    var filter = req.body;
    console.log('filter: ' + filter);
    if (typeof filter === 'undefined') {
      res.status(404).json([]);
      return;
    }

    searchQuizzes(filter).
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
