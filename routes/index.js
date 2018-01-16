var express = require('express');
var router = express.Router();

var payment = require('./payment');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.use('/payment', payment);

module.exports = router;
