var express = require('express');
var {authenticateJWT} = require('../models/checkCookie');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/mypage', authenticateJWT ,(req,res,next) =>{
  res.render('mypage');
});

module.exports = router;
