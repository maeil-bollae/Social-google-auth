var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  const accessToken = req.cookies && req.cookies.access_token;
  res.render('index', { accessToken });
});

module.exports = router;
