var $fh = require('fh-mbaas-api');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

var AUTH_SERVICE_GUID = process.env.AUTH_SERVICE_GUID || 'oh4pt5hwb5bg2sq3frv5rwt2';
var ADMIN_USERS = process.env.ADMIN_USERS ? process.env.ADMIN_USERS .split(',') : ['cv', 'cvicensa', 'cvicensa@redhat.com'];

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function _auth(username, password) {
  return new Promise(function(resolve, reject) {
    var path = '/auth';
    console.log('path: ' + path, 'AUTH_SERVICE_GUID', AUTH_SERVICE_GUID);

    $fh.service({
      "guid" : AUTH_SERVICE_GUID, // The 24 character unique id of the service
      "path": path, //the path part of the url excluding the hostname - this will be added automatically
      "method": "POST",   //all other HTTP methods are supported as well. e.g. HEAD, DELETE, OPTIONS
      "timeout": 25000, // timeout value specified in milliseconds. Default: 60000 (60s)
      "params": {username: username, password: password},
      //"headers" : {
        // Custom headers to add to the request. These will be appended to the default headers.
      //}
    }, function(err, body, response) {
      console.log('statuscode: ', response && response.statusCode);
      console.log('err:', err, 'body:', body);
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
}

function route() {
  var router = new express.Router();
  router.use(cors());
  router.use(bodyParser());

  router.post('/', function(req, res) {
    console.log(new Date(), 'In login route POST / req.body=', req.body);
    var username = req.body && req.body.username ? req.body.username : null;
    var password = req.body && req.body.password ? req.body.password : null;

    _auth(username, password)
    .then(function (result) {
      res.status(result.status).json(result);  
    })
    .catch(function (err) {
      res.status(err.status).json(err);  
    });

  });

  router.post('/old', function(req, res) {
    console.log(new Date(), 'In login route POST / req.body=', req.body);
    var username = req.body && req.body.username ? req.body.username : null;
    var password = req.body && req.body.password ? req.body.password : null;

    if (!validateEmail(username)) {
      res.status(401).json({msg: 'WRONG CREDENTIALS OR BAD LUCK'});
      return;
    }

    var roles = []
    if (ADMIN_USERS.indexOf(username) !== -1) {
      roles.push('ADMIN');
    }

    res.json({msg: 'Login OK', roles: roles});
  });

  return router;
}

module.exports = route;
