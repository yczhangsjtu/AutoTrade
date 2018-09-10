var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  cred = req.app.cred;
  console.log(cred);
  res.send('respond with a resource');
});

module.exports = router;
