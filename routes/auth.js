const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const db = require('../models/mariadb');
require('dotenv').config();

const router = express.Router();

// Access Token & Refresh Token 만료 시간 설정
const ACCESS_TOKEN_EXPIRY = '30m';
const REFRESH_TOKEN_EXPIRY_DAYS = '30d';

// Google OAuth 설정 (이메일 포함)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
    try {

        // 유저 조회
        let user = await db.findUserByGoogleId(profile.id);

        // 유저가 없으면 생성
        if (!user) {
            console.log("🛠 Creating new user...");
            user = await db.createUser({
                google_id: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                picture: profile.photos[0].value
            });
        }

        return done(null, user);
    } catch (error) {
        console.error("❌ Google OAuth 에러:", error);
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await db.findUserByGoogleId(id);
    done(null, user);
});

// Google 로그인 버튼 클릭 시 자동 로그인 실행 ['profile', 'email']을 불러옴
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google 로그인 콜백 (로그인 후 JWT 발급 및 쿠키 저장)
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), async (req, res) => {
    try{
        if (!req.user) {
            console.error("❌ 사용자 정보 없음!");
            return res.redirect('/');
        }

        console.log("✅ 로그인 성공 유저:", req.user.email);

        // Refresh Token 생성
        const refreshToken = jwt.sign(
            { id: req.user.google_id },
            process.env.JWT_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRY_DAYS }
        );

        // DB에 Refresh Token 저장
        await db.updateUserRefreshToken(req.user.google_id, refreshToken);

        // Access Token 생성
        const accessToken = jwt.sign(
            { id: req.user.google_id, email: req.user.email },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        // 사용자 정보 쿠키에 저장
        res.cookie('user_info', JSON.stringify({
            name: req.user.name,
            email: req.user.email,
            picture: req.user.picture
        }), { httpOnly: false, secure: false });

        // Access Token을 쿠키에 저장
        res.cookie('access_token', accessToken, { httpOnly: true, secure: false });

        // 로그인 완료하면 /mypage로 이동
        res.redirect('/mypage');
    } catch(error) {
        console.error("❌ 구글 로그인 오류:", error);
        res.redirect('/');
    }
});

// Refresh Token을 사용해 새로운 Access Token 발급
router.post('/refresh', async (req, res) => {
    try {
        const { google_id, refresh_token } = req.body;
        console.log("🔄 Refresh Token 요청:", google_id);

        // Refresh Token이 유효한지 확인
        const isValid = await db.isRefreshTokenValid(google_id, refresh_token);
        if (!isValid) {
            res.clearCookie('access_token');
            return res.status(401).json({ message: "세션이 만료되었습니다. 다시 로그인해주세요" });
        }

        // 새 Access Token 발급
        const newAccessToken = jwt.sign(
            { id: google_id },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        res.cookie('access_token', newAccessToken, { httpOnly: true, secure: false });
        return res.json({ access_token: newAccessToken });

    } catch (error) {
        console.error("❌ 리프레시 토큰 오류:", error);
        return res.status(500).json({ message: "인터넷 서버 오류" });
    }
});

// 로그아웃 (쿠키 & Refresh Token 삭제)
router.get('/logout', async (req, res) => {
    if (req.user) {
        await db.deleteUserRefreshToken(req.user.google_id);
    }
    res.clearCookie('access_token');
    res.redirect('/');
});

module.exports = router;
