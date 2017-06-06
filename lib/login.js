var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

var ADMIN_USERS = process.env.ADMIN_USERS ? process.env.ADMIN_USERS .split(',') : ['cv', 'cvicensa', 'cvicensa@redhat.com'];

function route() {
  var router = new express.Router();
  router.use(cors());
  router.use(bodyParser());

  router.post('/', function(req, res) {
    console.log(new Date(), 'In login route POST / req.body=', req.body);
    var username = req.body && req.body.username ? req.body.username : null;
    var password = req.body && req.body.password ? req.body.password : null;

    var roles = []
    if (ADMIN_USERS.indexOf(username) !== -1) {
      roles.push('ADMIN');
    }

    res.json({msg: 'Login OK', roles: roles});
  });

  return router;
}

module.exports = route;
