const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL 연결
const pool = mysql.createPool({
    host: process.env.DB_HOST ,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
});

// Google ID로 유저 조회
async function findUserByGoogleId(googleId) {
    try {
        console.log("👀 데이텁베이스에서 유저 찾는중");
        const [rows] = await pool.query("SELECT * FROM users WHERE google_id = ?", [googleId]);
        return rows[0] || null;
    } catch (error) {
        console.error("❌ 유저 찾는중 오류:", error);
        throw error;
    }
}

// 유저 생성
async function createUser(user) {
    try {
        console.log("🛠 새 유저 생성");
        await pool.query(
            "INSERT INTO users (google_id, name, email, picture, refresh_token) VALUES (?, ?, ?, ?, ?)",
            [user.google_id, user.name, user.email, user.picture, user.refresh_token]
        );
        return findUserByGoogleId(user.google_id);
    } catch (error) {
        console.error("❌ 유저 생성중 오류발생:", error);
        throw error;
    }
}

// Refresh Token 저장 및 업데이트
async function updateUserRefreshToken(googleId, refreshToken) {
    try {
        console.log("🔄 리프레시토큰 업데이트중...");
        await pool.query(
            "UPDATE users SET refresh_token = ? WHERE google_id = ?",
            [refreshToken, googleId]
        );
    } catch (error) {
        console.error("❌ 리프레시 토큰 오류:", error);
        throw error;
    }
}

// Refresh Token이 유효한지 확인
async function isRefreshTokenValid(googleId, refreshToken) {
    try {
        console.log("👀 리프레시 토큰 있는지 확인")
        const [rows] = await pool.query(
            "SELECT refresh_token FROM users WHERE google_id = ?",
            [googleId]
        );

        if (!rows[0]) return false;
        return rows[0].refresh_token === refreshToken;
    } catch (error) {
        console.error("❌ 리프레시 토큰 확인중 오류:", error);
        return false;
    }
}

// 로그아웃 시 Refresh Token 삭제
async function deleteUserRefreshToken(googleId) {
    try {
        await pool.query("UPDATE users SET refresh_token = NULL WHERE google_id = ?", [googleId]);
    } catch (error) {
        console.error("❌ 리프레시토큰 삭제중 오류:", error);
        throw error;
    }
}

module.exports = {
    findUserByGoogleId,
    createUser,
    updateUserRefreshToken,
    isRefreshTokenValid,
    deleteUserRefreshToken,
    pool
};
