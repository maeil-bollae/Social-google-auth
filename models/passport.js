// authStrategyFactory.js
const db = require('../models/db');

const usePassport = (passport, Strategy, provider)=>{
    let options = {
        clientID: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
        clientSecret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
        callbackURL: process.env[`${provider.toUpperCase()}_CALLBACK_URL`],
    };
    if (provider === 'facebook') {
        options.profileFields = ['id', 'displayName', 'emails'];
    }

    passport.use(new Strategy(options,
    async (accessToken, refreshToken, profile, done) => {
        try {
            console.log(`🛠 ${provider} 유저 조회...`);
            // 유저 및 이메일 조회
            let user = await db.findUserByEmail(profile.emails[0].value);
            
            // 유저가 없으면 생성
            if (!user) {
                user = await db.createSocialUser({
                    username: profile.username || undefined,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    phone_number: profile.phone_number || undefined,
                    provider_id: profile.id,
                    provider: provider,
                });
            } else if (user.auth_provider !== provider){
                const email = profile.emails[0].value;
                const userInfo = {
                        auth_provider_id: profile.id,
                        auth_provider: provider,
                    }
                user = await db.updateUser(email,userInfo);
            }
            
            return done(null, user);
        } catch (error) {
            console.error(`❌ ${provider} OAuth 에러:`, error);
            return done(error, null);
        }
    }));

};

module.exports = usePassport