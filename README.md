# 프로젝트에 사용될 구글 로그인 만들기

> 소셜 로그인이 뭔데?
소셜 사인 인 (Social Sign-in) 또는 소셜 사인 온 (Social Sign-on)이라고도 하는 소셜 로그인은 소셜 네트워킹 사이트의 정보를 이용해 타사 애플리케이션과 플랫폼에 손쉽게 로그인할 수 있는 프로세스를 말합니다. 이 프로세스는 계정을 만들 필요 없이 편리한 방법을 제공하여 로그인 및 등록 경험을 간소화할 목적으로 개발되었습니다.
출처: https://www.okta.com/kr/blog/2020/08/social-login/

구현 방법중 **프론트 + 백엔드**를 구현할 계획이다.
OAuth 인증을 백엔드에서 처리한 후, JWT를 발급하여 인증을 유지하는 방법
   - 장점
      - 토큰을 서버에서 관리하므로 보안이 좋음
      - 로그인 유지가 쉬움
      - 다양한 로그인 방식 연동 가능
   - 단점
      - 직접 백엔드 만들어야함
---
## 직접 구현하기전에
Node.js와 Express를 기반으로 구글 소셜 로그인을 구현할 예정이다.
js에서 구글의 OAuth 인증 처리를 위해서 Passport.js와 passport-google-oauth20을 사용할 예정이다.
그리고 JWT를 사용하여 Refresh & Access Token을 만들 예정이다.
> [Passport.js](https://www.passportjs.org/packages/passport-google-oauth20/)
Node.js를 위한 인증 미들웨어로 구글을 제외하고도 많은 다른 소셜로그인을 도와주는 고마운 라이브러리다. 다음과 같이 사용할 수 있다.
   - 설치
```bash
$ npm install passport-google-oauth20
```
   - 코드 작성
```js
var GoogleStrategy = require('passport-google-oauth20').Strategy;
 passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://www.example.com/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
```

### 구글 콘솔 설정하기
google로그인을 사용하기 전에 [Google Developers Console](https://console.cloud.google.com/)에서 프로젝트를 만들어 OAuth를 사용할 수 있도록 설정해야한다.
1. 먼저 "새 프로젝트"를 만들어준다.

![](https://velog.velcdn.com/images/wltjd1688/post/02d3a25b-815c-4a11-ade4-612e6ae0edc9/image.png)
![](https://velog.velcdn.com/images/wltjd1688/post/0d9b3eff-e6b4-4a54-8659-3751bad4992e/image.png)
![](https://velog.velcdn.com/images/wltjd1688/post/f38e0b58-acb9-4e6a-b27e-e88a23cbadf2/image.png)

이렇게 만들게 되면 다음과 같은 화면이 나온다.

![](https://velog.velcdn.com/images/wltjd1688/post/2ed2e62b-27da-4e9e-81e7-5bc4f4a822c3/image.png)

2. 여기서 시작하기를 누르고 채워주면 된다.

![](https://velog.velcdn.com/images/wltjd1688/post/31d08830-e625-4b93-ac1b-33cc57eabb4f/image.png)
![](https://velog.velcdn.com/images/wltjd1688/post/b2a722e4-06c8-4ee7-ab6b-52fed9985815/image.png)

3. 이제 애플리케이션 유형을 선택하고, 이름은 적당히 붙여준 다음, `승인된 자바스크립트 원본`항목에는 구글 로그인을 사용할 홈페이지 주소를(저는 http://localhost:3000 넣음) 넣고 `승인된 리디렉션 URL`항목에는 구글 로그인 후 리디렉션할 주소를 입력해주면 된다. 이는 코드를 짜면서 알려주겠다.

![](https://velog.velcdn.com/images/wltjd1688/post/3e426870-e1a6-4028-8a3c-70e60dc1c487/image.png)

4. 데이터 엑세스의 범위탬으로 넘어가서 `범위 추가 또는 삭제`를 눌러 다음과 같이 범위를 설정한다.

![](https://velog.velcdn.com/images/wltjd1688/post/16d7ec80-4e8b-40a4-9d18-bf3ddf6fcc17/image.png)

5. 대상 탭으로 들어가보면 현재는 테스트중이기에 테스트 사용자에 테스트를 진행하는 동안 로그인할 사용자를 추가하여서 구현하면 된다. 나중에 기능 구현이 끝나고 테스트가 끝난다면 위에 `앱 게시`버튼을 누르면 된다.

![](https://velog.velcdn.com/images/wltjd1688/post/04f90631-860a-4819-8fae-6b7e4e5d66c2/image.png)

6. 이렇게 만들게되면 `클라이언트 ID`와 `클라이언트 보안 비밀번호`를 확인할 수 있다.
이는 나중에 사용하므로 복사해두자

![](https://velog.velcdn.com/images/wltjd1688/post/68be5975-6a61-40b9-bcab-b830f5652d71/image.png)


### 전체적인 구조

1. 파일 구조: `$ npx express-generator`로 폴더들을 자동 생성한다. 거기에 `models/`파일을 만들고 db를 연결해주었다.
2. `.env`:  미리 복사해준  클라우드ID와 비밀번호는 `dotenv`를 통해 `.env`파일을 만들어 관리할 예정이다.
또한 JWT에 관한 몇가지 보안 사항도 추가할 예정이다.
3. `.gitignore`: 나중에 git에 올릴때 제외할 몇가지 파일들을 추가한다.

이렇게 하면 파일 구조와 간단한 예외사항 들을 정리할 수 있다.

이후에는 구현을 시작하였다.
#### /models
- mariadb.js
db를 연결하기 위해, mysql.createPool을 이용해 db를 연결하였다.
이후 구현을 위해 사용될 SQL코드들을 객체로 정리해 두었다.

- auth.js
로그인페이지와 마이페이지의 검증 로직들을 넣어두었다.

#### /routes
- auth.js
구글 로그인의 로직들을 만든 파일, passport를 이용해서 google과 연결하고, 여기서 받아온 정보를 토대로 유저생성, Refresh & access token 관리, 로그아웃 등에 관한 로직을 넣어둠

- index.js
홈페이지와 마이페이지 리다이렉션 작성

-users.js
원래 있던거

#### /views
- index.ejs
메인 페이지를 담당함

- mypage.js
마이페이지를 담당하며, 로그인한 정보를 띄워줌

## 구현하면서 마주친 문제들
1. 무한 리디렉션 문제
- 원인: 로그인을 확인하는 두 미들웨어가 충돌을 일으킴
- 해결: 로직을 수정하여 해결

2. DB "Unknown database 'movie_booking'" 오류
- 원인: db를 못참음;;
- 해결: movie가 아니라 movei로 지어서 만들어진 오류로 수정해서 해결

3. JWT expiresIn 오류
- 원인: .env 파일에 리프레쉬랑 어세스 쿠피의 지속시간을 넣을려다가 실패함
- 해결: const함수로 해당 파일에 넣어줌

---
## 참고
구글 로그인에 대한 전반적인 내용은 해당 블로그를 참고함 - https://dnjfht.tistory.com/149
