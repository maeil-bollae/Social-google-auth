var express = require('express');
var router = express.Router();
var auth = require('../models/auth');

/* GET home page. */
router.get('/', auth.checkLoggedIn, function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/mypage',auth.authenticateJWT, function(req, res, next) {
  res.render('mypage', { title: 'Express' });
});
module.exports = router;
