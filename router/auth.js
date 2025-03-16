const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const NaverStrategy = require('passport-naver').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const usePassport = require('../models/passport.js');
const auth = require('../controller/authController');
const db = require('../models/db');
const {checkLoggedIn} = require('../models/checkCookie')
require('dotenv').config();

const router = express.Router();

usePassport(passport, GoogleStrategy, 'google');
usePassport(passport, NaverStrategy, 'naver');
usePassport(passport, FacebookStrategy, 'facebook');

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await db.findUserBySocialId(id);
    done(null, user);
});

// 로그인 화면 요청
router.get('/', checkLoggedIn, (req,res,next)=>{
    res.render('login', {title: "Log In"})
})

// Local 회원가입 및 로그인 요청
router.post('/signup', auth.LocalSignup);
router.post('/login', auth.LocalLogin);

// Google 로그인 요청
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }),auth.socialLogin);

// 네이버 로그인 요청
router.get("/naver", passport.authenticate("naver"));
router.get("/naver/callback", passport.authenticate("naver", { failureRedirect: "/auth" }), auth.socialLogin);

// facebook 로그인 요청
router.get("/facebook", passport.authenticate("facebook"));
router.get("/facebook/callback", passport.authenticate("facebook", {failureRedirect: "/auth"}), auth.socialLogin);

// 로그아웃 요청
router.post('/logout', auth.logout);

module.exports = router;
