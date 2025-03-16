// tokenHelper.js
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
dotenv.config();

// Access Token & Refresh Token 
const generateAccessToken = (user) => {
    return jwt.sign({
        id: user.id
    },process.env.ACCESS_JWT_SECRET, {
        expiresIn: '30m',
        issuer: "admin"
    });
};

const generateRefreshToken = (user, type = "local") => {
    return jwt.sign({
        id: user.id,
        jti: uuidv4()
    },process.env.REFRESH_JWT_SECRET,{
        expiresIn: '30d',
        issuer: "admin"
    });
};

const userInfoToken = (user) =>{
    return JSON.stringify({
        name: user.name,
        email: user.email,
    });
}

function setTokenCookies(res, tokens) {
    tokens.forEach(token => {
        res.cookie(token.name, token.value, token.options);
    });
}

function clearTokenCookies(res, tokens) {
    tokens.forEach(name => {
        res.clearCookie(name);
    })
}

function AccessTokenPayload(req) {
    const token = req.cookies.access_token;
    if (!token) {
        console.error("Access token이 존재하지 않습니다.");
        return null;
    }
    try {
        // ACCESS_JWT_SECRET은 .env에 정의되어 있어야 합니다.
        const payload = jwt.verify(token, process.env.ACCESS_JWT_SECRET);
        return payload;
    } catch (err) {
        console.error("Access token 검증 오류:", err);
        return null;
    }
}

function RefreshTokenPayload(req) {
    const token = req.cookies.refresh_token;
    if (!token) {
        console.error("Refresh token이 존재하지 않습니다.");
        return null;
    }
    try {
        // REFRESH_JWT_SECRET은 .env에 정의되어 있어야 합니다.
        const payload = jwt.verify(token, process.env.REFRESH_JWT_SECRET);
        return payload;
    } catch (err) {
        console.error("Refresh token 검증 오류:", err);
        return null;
    }
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    userInfoToken,
    setTokenCookies,
    clearTokenCookies,
    AccessTokenPayload,
    RefreshTokenPayload
};
