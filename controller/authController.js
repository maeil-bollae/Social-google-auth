const db = require('../models/db');
const { StatusCodes } = require('http-status-codes');
const tokenUnit = require('../unit/tokenUnit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// 소셜 로그인 컨트롤러
async function socialLogin(req, res) {
    try {
        if (!req.user) {
            console.error("❌ 사용자 정보 없음!");
            return res.redirect('/');
        }
        const { email, id } = req.user;
        console.log("✅ 소셜로그인 성공 :", email);

        // 소셜 로그인 시 마지막 로그인 갱신 (auth_provider_id 기준)
        await db.updateUserLogin(id);

        // Refresh Token 생성 및 DB 저장
        const refreshToken = tokenUnit.generateRefreshToken(req.user);
        await db.insertRefreshTable(id, refreshToken,"Social");

        // 토큰 생성: Access Token, Refresh Token, User Info Token
        const accessToken = tokenUnit.generateAccessToken(req.user);
        const userInfoToken = tokenUnit.userInfoToken(req.user);

        // 쿠키 설정 (배열로 전달)
        const tokens = [
            {
                name: 'refresh_token',
                value: refreshToken,
                options: { httpOnly: true, secure: false, sameSite: 'Strict', path: '/' }
            },
            {
                name: 'access_token',
                value: accessToken,
                options: { httpOnly: true, secure: false, path: '/' }
            },
            {
                name: 'user_info',
                value: userInfoToken,
                options: { httpOnly: false, secure: false, path: '/' }
            }
        ];
        tokenUnit.setTokenCookies(res, tokens);

        res.redirect('/users/mypage');
    } catch (error) {
        console.error("❌ 소셜 로그인 오류:", error);
        res.redirect('/');
    }
}

// 로컬 회원가입 컨트롤러
async function LocalSignup(req, res, next) {
    try {
        let { email } = req.body;

        // 존재하는 유저인지 확인
        const check = await db.findUserByEmail(email);
        if (!!check && check.password) return res.status(StatusCodes.CONFLICT).json({ message: "😅 이미 사용중인 아이디입니다." });
        
            // 아니라면 회원가입 시키기
        const hashPassword = bcrypt.hashSync(req.body.password, 10);

        if (check && !check.password) {
            await db.updateUser(email,{
                username: req.body.username,
                name: req.body.name,
                password: hashPassword,
                phone_number: req.body.phone_number,
            })
            console.log("🎉 "+ req.body.name +"님 기존 소셜 계정에 로컬 정보 추가 완료!!")
            return res.redirect('/auth');
        }

        const newUser = {
            username: req.body.username, 
            name: req.body.name, 
            email: email, 
            password: hashPassword,
            phone_number: req.body.phone_number
        }
        
        await db.createLocalUser(newUser);
        console.log("🎉 "+ newUser.name +"님 회원가입이 완료되었습니다!!")
        return res.redirect('/auth');
    } catch (error) {
        console.error("❌ 회원가입 처리 오류:", error);
        return next(error);
    }
}

// 로컬 로그인 컨트롤러
async function LocalLogin(req, res, next) {
    try {
        const { email, password } = req.body;
        // 로컬 로그인은 email 기준으로 사용자 조회
        const user = await db.findUserByEmail(email);
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "잘못된 이메일 또는 비밀번호" });
        }

        console.log("✅ 로컬 로그인 성공 :", email);

        // 로컬 로그인 시 마지막 로그인 갱신 (id 기준)
        await db.updateUserLogin(user.id)

        // Refresh Token 생성 및 DB 저장
        const refreshToken = tokenUnit.generateRefreshToken(user);
        await db.insertRefreshTable(user.id, refreshToken);

        // 토큰 생성
        const accessToken = tokenUnit.generateAccessToken(user);
        const userInfoToken = tokenUnit.userInfoToken(user);

        const tokens = [
            {
                name: 'refresh_token',
                value: refreshToken,
                options: { httpOnly: true, secure: false, sameSite: 'Strict', path: '/' }
            },
            {
                name: 'access_token',
                value: accessToken,
                options: { httpOnly: true, secure: false, path: '/' }
            },
            {
                name: 'user_info',
                value: userInfoToken,
                options: { httpOnly: false, secure: false, path: '/' }
            }
        ];
        tokenUnit.setTokenCookies(res, tokens);

        res.redirect('/users/mypage');
    } catch (error) {
        console.error("❌ 로컬 로그인 오류:", error);
        res.status(500).json({ message: "서버 오류" });
    }
}

// 로그아웃 컨트롤러
async function logout(req, res) {
    try {
        const refreshPayload = tokenUnit.RefreshTokenPayload(req);

        if (refreshPayload && refreshPayload.id){
            await db.beactivateRefreshToken(refreshPayload.id);
        } else {
            console.log("❌ Refresh Token 오류.");
        }

        tokenUnit.clearTokenCookies(res, ["access_token", "refresh_token", "user_info"]);
        res.redirect("/");
    } catch(err){
        console.error("❌ 로그아웃 오류:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).end();
    }
}

module.exports = {
    LocalSignup,
    LocalLogin,
    socialLogin,
    logout,
};
