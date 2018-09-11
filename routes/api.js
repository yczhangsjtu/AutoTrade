var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  cred = req.app.locals.cred;
  res.send('respond with a resource');
});

module.exports = router;
