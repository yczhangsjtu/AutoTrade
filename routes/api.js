var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var logger = require('../src/logger.js')('api');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json({
    message: 'server is alive',
    data: {}
  });
});

router.get('/loggedin', function(req, res, next) {
  if(!req.session.key) {
    logger.debug('Not logged in');
    res.json({
      message: "Not logged in",
      data: false
    });
  } else {
    logger.debug('Logged in');
    res.json({
      message: "Logged in",
      data: true
    });
  }
});

router.post('/login', function(req, res, next) {
  if(!req.body.username) {
    res.redirect('/?message=empty-username');
    return;
  }
  if(!req.body.password) {
    res.redirect('/?message=empty-password');
    return;
  }
  cred = req.app.locals.cred;
  if(req.body.username != cred.username ||
      req.body.password != cred.password) {
    res.redirect('/?message=wrong-password');
    return;
  }
  logger.debug(JSON.stringify(req.session));
  crypto.randomBytes(48, function(err, buffer) {
    req.session.key = buffer.toString('hex');
    res.redirect('/');
  });
});

router.get('/logout', function(req, res, next) {
  logger.debug("logout: " + JSON.stringify(req.session));
  if(req.session.key) {
    logger.debug("Logging out");
    delete req.session.key;
    res.json({
      message: "Logged out",
      data: {}
    });
  } else {
    res.json({
      message: "Already logged out",
      data: {}
    });
  }
});

module.exports = router;
