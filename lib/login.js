var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

function route() {
  var router = new express.Router();
  router.use(cors());
  router.use(bodyParser());

  router.post('/', function(req, res) {
    console.log(new Date(), 'In login route POST / req.body=', req.body);
    var username = req.body && req.body.username ? req.body.username : null;
    var password = req.body && req.body.password ? req.body.password : null;

    res.json({msg: 'Login OK'});
  });

  return router;
}

module.exports = route;
