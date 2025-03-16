const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

// 이메일로 유저 조회
async function findUserByEmail(email) {
    try{
        console.log("👀 데이텁베이스에서 유저 찾는중");
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        return rows[0] || null;
    } catch(error){
        console.error("❌ 유저 찾는중 오류:", error);
        throw error;
    }
};

// Social로 유저 조회
async function findUserBySocialId(id) {
    try{
        console.log("👀 데이텁베이스에서 유저 찾는중");
        const [rows] = await db.query("SELECT * FROM users WHERE auth_provider_id = ?", [id]);
        return rows[0] || null;
    } catch(error){
        console.error("❌ 유저 찾는중 오류:", error);
        throw error;
    }
};

// id로 유저 조회
async function findUserById(id) {
    try{
        console.log("👀 데이텁베이스에서 유저 찾는중");
        const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
        return rows[0] || null;
    } catch(error){
        console.error("❌ 유저 찾는중 오류:", error);
        throw error;
    }
};

// Local 유저 생성
async function createLocalUser(user) {
    try {
        console.log("🛠 새 유저 생성");
        await db.query(
            "INSERT INTO users (username, name, email, password, phone_number) VALUES (?, ?, ?, ?, ?)",
            [user.username, user.name, user.email, user.password,user.phone_number]
        );
        return findUserByEmail(user.email);
    } catch (error) {
        console.error("❌ 유저 생성중 오류발생:", error);
        throw error;
    };
};

// 유저 마지막 로그인 갱신
async function updateUserLogin(id){
    try {
        console.log("⚙️ 마지막 로그인 갱신");

        await db.query(
            "UPDATE users SET last_login = NOW() WHERE id = ?", [id]
        );
    } catch (error) {
        console.error("❌ 유저 로그인기록 갱신중 오류:", error);
        throw error;
    };
} ;

// Social 유저 생성
async function createSocialUser(user) {
    try {
        console.log("🛠 새 유저 생성");
        await db.query(
            "INSERT INTO users (username, name, email, phone_number, auth_provider, auth_provider_id) VALUES (?, ?, ?, ?, ?, ?)",
            [user.username, user.name, user.email, user.phone_number, user.provider, user.provider_id]
        );
        return findUserByEmail(user.email);
    } catch (error) {
        console.error("❌ 유저 생성중 오류발생:", error);
        throw error;
    };
};

// 유저 수정
async function updateUser(email, user) {
    try {
        console.log("🛠 유저 정보 수정");
        const queryStart = "UPDATE users SET ";
        const elem = Object.keys(user);
        const queryFields = elem.reduce((acc, cur, index) => {
            const separator = (index < elem.length - 1) ? ', ' : ' ';
            return acc + `${cur} = ?${separator}`;
        }, "");
        
        const query = `${queryStart}${queryFields}WHERE email = ?`;
        const values = elem.map(field => user[field]);
        values.push(email);
        await db.query(query,values);
        return findUserByEmail(email);
    } catch (error) {
        console.error("❌ 유저 수정중 오류발생:", error);
        throw error;
    };
};

// Refresh Token 갱신 및 생성 유무 확인 'not_found' | 'expired' | 'active'
async function checkRefreshToken(id) {
    try {
        console.log("👀 리프레시토큰 상태 확인 중...");
        const [rows] = await db.query(
            "SELECT refresh_token, expires_at, revoked FROM tokens WHERE user_id = ? AND revoked = 0 ORDER BY created_at DESC LIMIT 1", [id]
,[id]
        );

        if (!rows.length) {
            return 'not_found';  // 토큰이 존재하지 않음
        };

        const token = rows[0];
        const now = new Date();
        if (now > new Date(token.expires_at)) {
            return 'expired';  // 토큰이 만료됨
        };

        return rows[0];  // 토큰이 존재하고, 만료되지 않았으며, 활성 상태
    } catch (error) {
        console.error("❌ 리프레시 토큰 상태 확인 오류:", error);
        throw error;
    };
};

// Refresh Token 생성
async function insertRefreshTable(id, token){
    try {
        console.log("🥠 리프레시토큰 생성중...");
        let sql = "INSERT INTO tokens (user_id, refresh_token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))";
        await db.query( sql, [id, token] );

    } catch (error) {
        console.error("❌ 리프레시 토큰 생성 오류:", error);
        throw error;
    };
};

// 로그아웃 시 Refresh Token 비활성화
async function beactivateRefreshToken(id) {
    try {
        console.log("🔄 리프레시토큰 비활성화중...");
        await db.query(
            "UPDATE tokens SET revoked = 1 WHERE id = ( SELECT id FROM ( SELECT id FROM tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1 ) AS subquery);",
            [id]
        );
    } catch (error) {
        console.error("❌ 리프레시 토큰 비활성화중 오류:", error);
        throw error;
    };
};

module.exports = {
    db,
    findUserBySocialId,
    findUserById,
    createLocalUser,
    findUserByEmail,
    updateUser,
    createSocialUser,
    updateUserLogin,
    checkRefreshToken,
    insertRefreshTable,
    beactivateRefreshToken
};