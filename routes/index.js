var express = require('express');
var router = express.Router();

var payment = require('./payment');
var email = require('./email');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.use('/payment', payment);
router.use('/email', email);

module.exports = router;
