const jwt = require('jsonwebtoken');
const db = require('./mariadb');
require('dotenv').config();

// JWT토큰으로 로그인 한적 있는지 확인
const authenticateJWT = async (req, res, next) => {
    const token = req.cookies.access_token;
    if (!token) return res.redirect('/');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db.findUserByGoogleId(decoded.id);
        if (!user) return res.redirect('/');
        
        req.user = user;
        next();
    } catch (err) {
        return res.redirect('/');
    }
};

// 이미 로그인 했다면 mypage로 이동
function checkLoggedIn(req, res, next) {
    const token = req.cookies && req.cookies.access_token;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/mypage');
        } catch (err) {
            next();
        }
    } else {
        next();
    }
}

module.exports = { 
    authenticateJWT,
    checkLoggedIn
};
