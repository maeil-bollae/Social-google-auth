const jwt = require('jsonwebtoken');
const db = require('./db');
const tokenUnit = require('../unit/tokenUnit');
const { StatusCodes } = require('http-status-codes');
require('dotenv').config();

// JWT토큰으로 확인하기
async function authenticateJWT(req, res, next) {
    const accessToken = req.cookies && req.cookies.access_token;
    const refreshToken = req.cookies && req.cookies.refresh_token;

    // 액세스 토큰이 유효하면 바로 진행
    if (accessToken) return next();

    // 액세스 토큰은 없지만, 리프레시 토큰이 있으면 갱신 시도
    if (!accessToken && refreshToken) {
        const result = await reissueAccessToken(req, res);
        if (result && result.success) {
            return next();
        } else {
            return res.status(StatusCodes.UNAUTHORIZED).send("인증에 실패했습니다.");
        }
    }

    return res.status(StatusCodes.UNAUTHORIZED).send("인증이 필요합니다.");
}

async function checkLoggedIn(req, res, next) {
    const accessToken = req.cookies && req.cookies.access_token;
    const refreshToken = req.cookies && req.cookies.refresh_token;

    // Access 토큰이 있으면 접근 불가
    if (accessToken) {
        return res.status(StatusCodes.UNAUTHORIZED).send("인증이 필요합니다.");
    }
    
    // Access 토큰은 없고, Refresh 토큰만 있는 경우
    if (refreshToken) {
        const result = await reissueAccessToken(req, res);
        if (result && result.success) {
            return res.status(StatusCodes.UNAUTHORIZED).send("인증이 필요합니다.");
        } else {
            return next();
        }
    }
    
    return next();
}



// Refresh Token을 사용해 새로운 Access Token 발급
async function reissueAccessToken(req, res) {
    try {
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) {
            res.clearCookie('access_token', { path: '/' });
            return { success: false, message: "리프레시 토큰이 없습니다." };
        }
        let payload;
        try {
            payload = jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET);
        } catch (err) {
            res.clearCookie('access_token', { path: '/' });
            res.clearCookie('refresh_token', { path: '/' });
            return { success: false, message: "유효하지 않은 리프레시 토큰입니다." };
        }
        const isValid = await db.checkRefreshToken(payload.id);
        if (typeof isValid === "string" || isValid.refresh_token !== refreshToken) {
            res.clearCookie('access_token', { path: '/' });
            res.clearCookie('refresh_token', { path: '/' });
            console.log("세션이 만료되었다.")
            return { success: false, message: "세션이 만료되었습니다." };
        }
        const newAccessToken = tokenUnit.generateAccessToken({
            id: payload.id,
            email: payload.email
        });
        res.cookie('access_token', newAccessToken, { httpOnly: true, secure: false });
        return { success: true, access_token: newAccessToken };
    } catch (err) {
        console.error("❌ 리프레시 토큰 오류:", err);
        return { success: false, message: "서버 오류" };
    }
}


module.exports = { 
    authenticateJWT,
    checkLoggedIn
};