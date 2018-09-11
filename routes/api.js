var express = require('express');
var router = express.Router();
var crypto = require('crypto');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json({
    message: 'server is alive',
    data: {}
  });
});

router.get('/loggedin', function(req, res, next) {
  if(!req.session.key) {
    res.json({
      message: "Not logged in",
      data: false
    });
  } else {
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
  crypto.randomBytes(48, function(err, buffer) {
    req.session.key = buffer.toString('hex');
    res.redirect('/');
  });
});

module.exports = router;
