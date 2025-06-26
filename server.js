const express = require('express'); //express 기본 라우팅
const app = express(); //express 기본 라우팅
const port = 9070;
const bcrypt = require('bcrypt'); // 해시 암호화를 위함
const jwt = require('jsonwebtoken'); // 토큰 생성을 위함
const SECRET_KEY = 'test';

// 교차출처허용
const cors = require('cors'); //교차출처공유 허용하기 위함
app.use(cors());

app.use(express.json()); //JSON 본문 파싱 미들웨어

/* --------------- 그린마켓 --------------- */
/* -- 상품 이미지 업로드를 위함 -- */
/* -- uploads 폴더 자동 생성 & 정적 제공 -- */
const fs   = require('fs');
const path = require('path');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir)); // http://localhost:9070/uploads/파일명 접근 가능

/* -- multer 설정 -- */
// multer
const multer = require('multer');

// multer 연결
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}${Date.now()}${ext}`);
  }
});

const upload = multer({ storage }).fields([
  { name: 'image_main', maxCount: 1},
  { name: 'image_1', maxCount: 1},
  { name: 'image_2', maxCount: 1},
  { name: 'image_3', maxCount: 1},
  { name: 'image_4', maxCount: 1},
  { name: 'image_5', maxCount: 1},
  { name: 'image_6', maxCount: 1},
]);

// MySQL
const mysql = require('mysql');  //mysql변수 선언
//1. mysql 연결 정보 셋팅
/* KDT */
const connectionKdt = mysql.createConnection({
  host:'database',
  user:'root',
  password:'1234',
  database:'kdt'
});

//2. MYSQL DB접속시 오류가 나면 에러 출력하기, 성공하면 '성공'표시하기
connectionKdt.connect((err)=>{
  if(err){
    console.log('MYSQL연결 실패 : ', err);
    return;
  }
  console.log('MYSQL연결 성공');
});

/* Ginipet */
const connectionGnp = mysql.createConnection({
  host:'database',
  user:'root',
  password:'1234',
  database:'kdt'
});
connectionGnp.connect((err)=>{
  if(err){
    console.log('MYSQL연결 실패 : ', err);
    return;
  }
  console.log('MYSQL연결 성공');
});

/* GreenMarket */
const connectionGM = mysql.createConnection({
  host:'database',
  user:'root',
  password:'1234',
  database:'greenmarket'
});

connectionGM.connect((err)=>{
  if(err){
    console.log('MYSQL연결 실패 : ', err);
    return;
  }
  console.log('MYSQL연결 성공');
});

/* ------------ KDT 수업 ----------------- */
// 3. 로그인 폼에서 post 방식으로 전달받은 데이터를 DB에 조회하여 결과값을 리턴함.
app.post('/kdt_login', (req, res) => {
  const {username, password} = req.body;

  connectionKdt.query('SELECT * FROM users WHERE username = ?', [username], async(err, result) => {
    if(err || result.length === 0){
      return res.status(401).json({error: '아이디 또는 비밀번호가 틀립니다.'});
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch){
      return res.status(401).json({error : '아이디 또는 비밀번호가 틀립니다.'});
    }

    // 토큰 생성(1시간)
    const token = jwt.sign({id: user.id, username : user.name}, SECRET_KEY, {expiresIn: '1h'});

    // 토큰 발급
    res.json({token, user: {id: user.id, username: user.username}});
  });
});

// 4. Register.js에서 넘겨 받은 username, password를 SQL DB에 입력하여 추가한다.
app.post('/kdt_register', async(req, res) => {
  const {username, password} = req.body;
  const hash = await bcrypt.hash(password, 10); // 패스워드 hash 암호화

  connectionKdt.query(
    'INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], (err) => {
      if(err){
        if(err.code == 'ER_DUP_ENTRY'){
          return res.status(400).json({error: '이미 존재하는 아이디입니다.'});
        }
        return res.status(500).json({error: '회원가입 실패'});
      }
      // res.status({success: true}); // 입력시 '[nodemon] app crashed - waiting for file changes before starting...' 오류 발생하며, error만 출력
      res.status(200).json({success: true}); //문제해결 (GPT 도움)
    }
  )
});

// Login2, Register2
// 3-1. 로그인(Login2)
app.post('/kdt_login2', (req, res) => {
  const {username, password} = req.body;

  connectionKdt.query(
    'SELECT * FROM users2 WHERE username = ?', [username], async(err, result) => {
      if(err || result.length === 0) {
        return res.status(401).json({error: '아이디 또는 비밀번호가 틀립니다.'});
      }

      const user = result[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if(!isMatch) {
        return res.status(401).json({error : '아이디 또는 비밀번호가 틀립니다.'});
      }

      // 1시간 토큰 생성
      const token = jwt.sign({id: user.id, username: user.name}, SECRET_KEY, {expiresIn: '1h'});

      // 토큰 발급
      res.json({token, user: {id: user.id, username: username}});
    }
  );
});

// 4-1. 회원가입(Register2)
app.post('/kdt_register2', async(req, res) => {
  const {username, password, tel, email} = req.body;
  const hash = await bcrypt.hash(password, 10);

  connectionKdt.query(
    'INSERT INTO users2 (username, password, tel, email) VALUES (?, ?, ?, ?)', [username, hash, tel, email], (err) => {
      if(err) {
        if(err.code == 'ER_DUP_ENTRY') {
          return res.status(400).json({error: '이미 존재하는 아이디입니다.'});
        }
        return res.status(500).json({error: '회원가입 실패'});
      }
      res.status(200).json({success: true});
    }
  )
});

//방법1. db연결 테스트 - 메세지만 확인하기 위함
// app.get('/', (req,res)=>{
//   //특정 경로로 요청된 정보를 처리
//   res.json('Excused from Backend');
// });

//방법2. SQL쿼리문을 사용하여 DB에서 조회된 데이터를 출력한다.(Read)
//1. 상품목록 조회하기
//상품목록은 상품코드(g_code), 상품명(g_name), 상품가격(g_cost)으로 구성되어 있다.
app.get('/goods', (req,res)=>{
  connectionKdt.query("SELECT * FROM goods ORDER BY goods.g_code DESC", (err, results)=>{
    if(err){
      console.log('쿼리문 오류 : ', err);
      res.status(500).json({error: 'DB쿼리 오류'});
      return;
    }
    res.json(results);
  });
});

//2. 상품삭제(DELETE)
//상품삭제는 상품코드(g_code)를 기준으로 삭제한다.
app.delete('/goods/:g_code', (req, res) => {
  const g_code = req.params.g_code;
  connectionKdt.query(
    'DELETE FROM goods WHERE g_code = ?',
    [g_code],
    (err, result) => {
      if (err) {
        console.log('삭제 오류:', err);
        res.status(500).json({ error: '상품 삭제 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

//3. 상품수정 (UPDATE)
//상품수정은 상품코드(g_code)를 기준으로 수정한다.
app.put('/goods/update/:g_code', (req, res)=>{
  const g_code = req.params.g_code;
  const {g_name, g_cost} = req.body;

  //update쿼리문 작성하여 실행
  connectionKdt.query(
    'UPDATE goods SET g_name = ?, g_cost= ? WHERE g_code= ?', [g_name, g_cost, g_code],
    (err, result) => {
      if(err){
        console.log('수정 오류 : ', err);
        res.status(500).json({error : '상품 수정하기 실패'});
        return;
      }
      res.json({success:true});
    }
  );
});

//4. 특정상품 조회하기(SELECT)
// 특정 상품 조회 (GET /goods/:g_code)
app.get('/goods/:g_code', (req, res) => {
  const g_code = req.params.g_code;

  connectionKdt.query(
    'SELECT * FROM goods WHERE g_code = ?',
    [g_code],
    (err, results) => {
      if (err) {
        console.log('조회 오류:', err);
        res.status(500).json({ error: '상품 조회 실패' });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ error: '해당 상품이 없습니다.' });
        return;
      }

      res.json(results[0]); // 단일 객체만 반환
    }
  );
});

// 5. 상품 등록하기(Create, Insert Into)
// post 방식으로 /goods 받음
app.post('/goods', (req, res) => { //request, result
  const {g_name, g_cost} = req.body;
  if(!g_name || !g_cost) {
    return res.status(400).json({error: '필수 항목이 누락되었습니다. 다시 확인하세요.'});
  }

  // 쿼리문 실행
  connectionKdt.query(
    'INSERT INTO goods (g_name, g_cost) VALUES (?, ?)', [g_name, g_cost], 
    (err, result) => { //error
      if(err){
        console.log('DB 등록 실패 : ', err);
        res.status(500).json({error : '상품 등록 실패'});
        return;
      }
      res.json({success:true, insertId: result.insertId});
    }
  )
});

/* book_store */
// 1. 상품 목록 조회하기(books)
app.get('/books', (req, res) => {
  connectionKdt.query('SELECT * FROM book_store ORDER BY num DESC', (err, results) => {
    if(err) {
      console.log('쿼리문 오류 : ', err);
      res.status(500).json({error: 'DB 쿼리 오류'});
      return;
    }
    res.json(results);
  });
});

// 2. books 상품 삭제(delete)
app.delete('/books/:num', (req,res) => {
  const num = req.params.num;
  connectionKdt.query('DELETE FROM book_store WHERE num = ?', [num], (err, result) => {
    if(err) {
      console.log('삭제 오류 : ', err);
      res.status(500).json({error: '상품 삭제 실패'});
      return;
    }
    res.json({success: true});
  });
});

// 3. books 상품 수정
app.put('/books/update/:num', (req, res) => {
  const num = req.params.num;
  const {name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num} = req.body;

  connectionKdt.query(
    'UPDATE book_store SET name = ?, area1 = ?, area2 = ?, area3 = ?, BOOK_CNT = ?, owner_nm = ?, tel_num = ? WHERE num = ?', [name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num, num],
    (err) => {
      if(err){
        console.log('수정 오류 : ', err);
        res.status(500).json({error: '상품 수정 실패'});
        return;
      }
      res.json({success: true});
    }
  )
});

// 4. books 특정상품 조회하기(select)
app.get('/books/:num', (req, res) => {
  const num = req.params.num;

  connectionKdt.query(
    'SELECT * FROM book_store WHERE num = ?', [num], 
    (err, result) => {
      if(err){
        console.log('조회 오류', err);
        res.status(500).json({error: '상품 조회 실패'});
        return;
      }
      if(result.length === 0) {
        res.status(404).json({error: '해당 자료가 없습니다.'});
        return;
      }
      res.json(result[0]); //단일객체 반환
    }
  )
});

// 5. books 상품 등록하기
app.post('/books', (req, res) => {
  const {name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num} = req.body;
  if(!name || !area1 || !area2 || !area3 || !BOOK_CNT || !owner_nm || !tel_num) {
    return res.status(400).json({error: '필수 항목이 누락되었습니다. 재확인 바랍니다.'});
  }

  connectionKdt.query(
    'INSERT INTO book_store (name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num) VALUES (?, ?, ?, ?, ?, ?, ?)', 
    [name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num], 
    (err, result) => {
      if(err) {
        console.log('DB 등록 실패 : ', err);
        res.status(500).json({error: '상품 등록 실패'});
        return;
      }
      res.json({success: true, insertId: result.insertId});
    }
  )
});

// fruit
// 1. fruits 목록 조회
app.get('/fruits', (req, res) => {
  connectionKdt.query(
    'SELECT * FROM fruit ORDER BY num DESC', (err, result) => {
      if(err){
        console.log('쿼리문 오류 : ', err);
        res.status(500).json({error: 'DB 쿼리 오류'});
        return;
      }
      res.json(result);
    }
  )
});

// 2. fruits 데이터 삭제
app.delete('/fruits/:num', (req, res) => {
  const num = req.params.num;

  connectionKdt.query(
    'DELETE FROM fruit WHERE num = ?', [num], (err) => {
      if(err){
        console.log('삭제 오류 : ', err);
        res.status(500).json({error: '삭제 실패'});
        return;
      }
      res.json({success: true});
    }
  )
});

// 3. fruits 데이터 수정
app.put('/fruits/update/:num', (req, res) => {
  const num = req.params.num;
  const {name, price, color, country} = req.body;

  connectionKdt.query(
    'UPDATE fruit SET name = ?, price = ?, color = ?, country = ? WHERE num = ?', [name, price, color, country, num], (err) => {
      if(err){
        console.log('수정 오류 : ', err);
        res.status(500).json({error: '상품 수정 실패'});
        return;
      }
      res.json({success: true});
    }
  )
});

// 4. fruits 특정 데이터 조회
app.get('/fruits/:num', (req, res) => {
  const num = req.params.num;

  connectionKdt.query(
    'SELECT * FROM fruit WHERE num = ?', [num], (err, result) => {
      if(err){
        console.log('조회 오류 : ', err);
        res.status(500).json({error : '상품 조회 실패'});
        return;
      }
      if(result.length === 0) {
        res.status(404).json({error: '해당 자료가 없습니다.'});
        return;
      }
      res.json(result[0]);
    }
  )
});

// 5. fruits 상품 등록하기
app.post('/fruits', (req, res) => {
  const {name, price, color, country} = req.body;
  if(!name || !price || !color || !country) {
    return res.status(400).json({error: '필수 항목이 누락되었습니다. 다시 확인하세요.'});
  }

  // fruit DB입력을 위한 쿼리문 실행
  connectionKdt.query(
    // ? = 입력할 값, 변수의 개념
    'INSERT INTO fruit (name, price, color, country) VALUES (?, ?, ?, ?)', 
    [name, price, color, country], 
    (err, result) => {
      if(err){
        console.log('등록 오류 : ', err);
        res.status(500).json({error: '상품 등록 실패'});
        return;
      }
      res.json({success: true, insertId: result.insertId});
    }
  )
});

// 6. Question 등록하기
app.post('/question', (req, res) => {
  const {name, tel, email, txtbox} = req.body;

  if(!name || !tel || !email || !txtbox) {
    return res.status(400).json({ error: '필수 입력 항목이 누락되었습니다. 다시 확인하세요.'});
  }

  // 변수에 저장된 데이터를 sql 쿼리문으로 DB에 입력
  connectionKdt.query(
    'INSERT INTO question (name, tel, email, txtbox) VALUES (?, ?, ?, ?)', [name, tel, email, txtbox], 
    (err) => {
      if(err){
        console.log('등록 오류 : ', err);
        res.status(500).json({error: '데이터 입력 오류'});
        return;
      }
      res.send('질문 등록 완료');
    }
  )
});

/* --------------- ginipet --------------- */
app.post('/gp_register', async (req, res) => {
  // res.json('Excused from Backend');
  try {
    const { username, password, tel, email } = req.body;
    const hash = await bcrypt.hash(password, 10); // 해시 패스워드로 암호화
  
    connectionGnp.query('INSERT INTO ginipet_users (username, password, tel, email) VALUES (?, ?, ?, ?)', [username, hash, tel, email], (err) => {
      if(err){
        if(err.code == 'ER_DUP_ENTRY'){
          return res.status(400).json({error: '이미 존재하는 아이디입니다.'});
        }
        return res.status(500).json({error: '회원가입 실패'});
      }
      res.json({success: true});
    });
  } catch (error) {
    res.status(500).json({ error: '서버 내부 오류' });
  }
});

// 로그인 폼에서 전달받은 username, password 값을 처리
app.post('/gp_login', (req, res) => {
  const {username, password} = req.body;

  connectionGnp.query('SELECT * from ginipet_users WHERE username = ?', [username], async(err, results) => {
    if(err || results.length === 0) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch) {
      return res.status(401).json ({ error: '아이디 또는 비밀번호가 틀립니다.'});
    }

    // 토큰 생성시 1시간 설정
    const token = jwt.sign({id: user.id, username: user.username}, SECRET_KEY, {expiresIn: '1h'});
    
    // 토큰 발급
    res.json({token});
  });
});

/* --------------- 그린마켓 --------------- */
/* -- 로그인/회원가입 -- */
// 회원가입
app.post('/register', async(req, res) => {
  const { username, userid, password, phone, email, region } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10); // 해시 암호화

    const query = 'INSERT INTO green_users (username, userid, password, phone, email, region) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [username, userid, hash, phone, email, region];

    connectionGM.query(query, values, (err) => {
      if(err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ success: false, message: '이미 존재하는 아이디 또는 이메일입니다.' });
        }
        return res.status(500).json({ success: false, message: '회원가입 실패', error: err });
      }
      res.json({success: true});
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 로그인
app.post('/login', (req, res) => {
  const {userid, password} = req.body;

  connectionGM.query('SELECT * FROM green_users WHERE userid = ?', [userid], async(err, results) => {
    // if(err || results.length === 0) {return res.status(401).json({error: '아이디 또는 비밀번호가 틀렸습니다.'});}

    if (err) {
      console.error('DB 오류:', err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }

    if (results.length === 0) {
      return res.status(400).json({ success: false, message: '아이디 또는 비밀번호가 잘못되었습니다.' });
    }

    const user = results[0];

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 잘못되었습니다.' });
      }

      // 로그인 성공 시 last_login 업데이트
      const now = new Date();
      connectionGM.query(
        'UPDATE green_users SET last_login = ? WHERE id = ?',
        [now, user.id],
        (updateErr) => {
          if (updateErr) console.error('last_login 업데이트 실패:', updateErr);
        }
      );

      // 관리자 여부 판별
      const role = user.userid === 'admin' ? 'admin' : 'user' // userid가 'admin'일 때만 role: 'admin' 포함

      // 토큰 생성 관련 변수
      const payload = {
        id: user.id,
        userid: user.userid,
        username: user.username,
        role: role
      }

      // 1시간 토큰 생성
      const token = jwt.sign(payload, SECRET_KEY, {expiresIn: '1h'});

      // 토큰 발급
      res.json({token, user: {id: user.id, userid: user.userid, username: user.username, role: user.role,last_login: now}});
    } catch (compareError) {
      console.error('비밀번호 비교 실패:', compareError);
      res.status(500).json({ success: false, message: '로그인 처리 중 오류 발생' });
    }
  });
});

// 회원정보 수정
app.put('/member/update/:id', async(req, res) => {
  const {username, password, phone, email, region} = req.body
  const {id} = req.params;

  try {
    let hash;
    if(password) {
      hash = await bcrypt.hash(password, 10);
    } //해시 암호화(다시 지정), 비밀번호 있을 때만 처리

    const query = 'UPDATE green_users SET username = ?, password = ?, phone = ?, email = ?, region = ? WHERE id = ?';
    const values = [username, hash, phone, email, region, id];
    
    connectionGM.query(query, values, (err) => {
      if(err) {
        console.log('수정 오류 : ', err);
        res.status(500).json({error: '수정 실패'});
        return;
      }
      res.json({success: true});
    });
  } catch(error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 회원정보 수정을 위한 특정 조회
app.get('/member/:id', (req, res) => {
  const id = parseInt(req.params.id, 10); //숫자형 변환

  // 비밀번호 제외하고 불러오기
  connectionGM.query('SELECT id, username, userid, phone, email, region FROM green_users WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.log('조회 오류 : ', err);
      res.status(500).json({error: '조회 실패'});
      return;
    }
    if (results.length === 0) {
      res.status(404).json({error: '해당 정보가 없습니다.'});
      return;
    }
    res.json(results[0]); // 단일 객체만 반환
  });
});

/* -- 상품 -- */
// 회원 인증 미들웨어
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: '토큰 없음' });
// 토큰 검증
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    req.user = user;
    next();
  });
}

// 상품 등록(= post)
app.post('/products', authenticateToken, upload, (req, res) => {
  upload(req, res, (uploadErr) => {
    if (uploadErr) {
      console.error('🔥 파일 업로드 실패:', uploadErr);
      return res.status(500).json({ error: '파일 업로드 실패' });
    }

    const b = req.body;
    const img = key => req.files?.[key]?.[0]?.filename ?? null;

    console.log('✅ req.user:', req.user);
    console.log('✅ req.body:', req.body);
    console.log('✅ req.files:', req.files);
    
    const owner_id = req.user.id;  // 토큰에서 owner_id 가져오기

    const sql = `INSERT INTO green_products (owner_id, title, brand, kind, \`condition\`, price, trade_type, region, description, shipping_fee, image_main, image_1, image_2, image_3, image_4, image_5, image_6) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      owner_id, // 클라이언트가 보내지 않는 owner_id, 서버에서 넣음
      b.title, b.brand, b.kind, b.condition, b.price, b.tradeType, b.region, b.description, b.shipping_fee || 0, img('image_main'), img('image_1'), img('image_2'), img('image_3'), img('image_4'), img('image_5'), img('image_6')
    ];

    connectionGM.query(sql, params, (err, result) => {
      if(err) {
        console.error('INSERT ERROR: ', err);
        return res.status(500).json({error: '상품 등록 실패'});
      }
      res.json({success: true, id: result.insertId});
    });
  });
});

// 상품 조회 API
//상품상세페이지에서 카테고리가 같은 상품 목록 조회 현재 보고 있는 상품은 제외
app.get('/products', (req, res) => {
  const { owner_id, exclude_id, category } = req.query;

  let query = 'SELECT * FROM green_products WHERE 1=1';
  const params = [];

  if (owner_id) {
    query += ' AND owner_id = ?';
    params.push(owner_id);
  }

  if (exclude_id) {
    query += ' AND id != ?';
    params.push(exclude_id);
  }

  if (category) {
    query += ' AND kind = ?';
    params.push(category);
  }

  query += ' ORDER BY id DESC';

  connectionGM.query(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: '조회 실패' });

      const products = rows.map(r => ({
        id: r.id, title: r.title, brand: r.brand, kind: r.kind, condition: r.condition, price: r.price, tradeType: r.trade_type, region: r.region, description: r.description, datetime: r.datetime, images: [r.image_main, r.image_1, r.image_2, r.image_3, r.image_4, r.image_5, r.image_6].filter(Boolean)
      }));
      res.json(products);
    }
  )
});

// 상품 상세 조회
//상세페이지에서 판매자의 다른 상품 목록 조회
app.get('/products/:id', (req, res) => {
  const sql = `
    SELECT p.*, u.username AS seller_name,
    (SELECT COUNT(*) FROM green_products WHERE owner_id = p.owner_id) AS seller_product_count
    FROM green_products p
    JOIN green_users u ON p.owner_id = u.id
    WHERE p.id = ?`;
  connectionGM.query(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB 오류' });
    if (!rows.length) return res.status(404).json({ error: '상품 없음' });
    res.json(rows[0]);
  });
});

//상품을 올린 사용자만 삭제 버튼 기능 구현
app.delete('/products/:id', authenticateToken, (req, res) => {
  const productId = req.params.id;
  const userId = req.user.id;

  // 1) 상품 소유자 확인
  const checkOwnerSql = 'SELECT owner_id FROM green_products WHERE id = ?';
  connectionGM.query(checkOwnerSql, [productId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB 오류' });
    if (rows.length === 0) return res.status(404).json({ error: '상품 없음' });

    const ownerId = rows[0].owner_id;
    if (ownerId !== userId) {
      return res.status(403).json({ error: '삭제 권한 없음' });
    }

    // 2) 삭제 쿼리 실행
    const deleteSql = 'DELETE FROM green_products WHERE id = ?';
    connectionGM.query(deleteSql, [productId], (deleteErr, result) => {
      if (deleteErr) return res.status(500).json({ error: '삭제 실패' });
      res.json({ success: true });
    });
  });
});

//상품수정
app.post('/products/edit/:id', authenticateToken, (req, res) => {
  const productId = req.params.id;

  upload(req, res, (uploadErr) => {
    if (uploadErr) {
      console.error('파일 업로드 실패:', uploadErr);
      return res.status(500).json({ error: '파일 업로드 실패' });
    }
    const { title, brand, kind, condition, price, trade_type, region, description, shipping_fee } = req.body;

    const img = key => req.files?.[key]?.[0]?.filename ?? null;

    const params = [
      title,
      brand,
      kind,
      condition,
      price,
      trade_type,
      region,
      description,
      shipping_fee || 0,
      img('image_main'),
      img('image_1'),
      img('image_2'),
      img('image_3'),
      img('image_4'),
      img('image_5'),
      img('image_6'),
      productId
    ];

    const sql = `
      UPDATE green_products 
      SET title = ?, brand = ?, kind = ?, \`condition\` = ?, price = ?, trade_type = ?, 
          region = ?, description = ?, shipping_fee = ?,
          image_main = COALESCE(?, image_main),
          image_1 = COALESCE(?, image_1),
          image_2 = COALESCE(?, image_2),
          image_3 = COALESCE(?, image_3),
          image_4 = COALESCE(?, image_4),
          image_5 = COALESCE(?, image_5),
          image_6 = COALESCE(?, image_6)
      WHERE id = ?
    `;

    connectionGM.query(sql, params, (err) => {
      if (err) {
        console.error('❌ 상품 수정 에러:', err.sqlMessage || err.message);
        return res.status(500).json({ error: err.sqlMessage || '상품 수정 실패' });
      }
      res.json({ success: true });
    });
  });
});

/* -- 장바구니 -- */
//장바구니 조회 (하단과 유사)
app.get('/api/cart', authenticateToken, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const sql = `
    SELECT cart_id AS id, product_id, title, brand, \`condition\`, price, shipping_fee, trade_type, region, image_main, added_at
    FROM green_cart
    WHERE user_id = ?
  `;
  connectionGM.query(sql, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'DB 오류' });
    res.json(results); 
  });
});

//장바구니 삭제
app.delete('/api/cart', authenticateToken, (req, res) => {
  const ids = req.body.ids;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: '삭제할 상품 ID가 필요합니다.' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const sql = `DELETE FROM green_cart WHERE user_id = ? AND cart_id IN (${placeholders})`;

  connectionGM.query(sql, [req.user.id, ...ids], (err, result) => {
    if (err) return res.status(500).json({ message: '삭제 실패' });
    res.json({ success: true, affectedRows: result.affectedRows });
  });
});

/* -- 장바구니 추가 -- */
app.post('/api/cart', authenticateToken, (req, res) => {
  const { product_id } = req.body;
  // 상품 상세 정보 조회
  const productSql = 
    'SELECT title, brand, \`condition\`, price, trade_type, region, image_main, shipping_fee FROM green_products WHERE id = ?';
  connectionGM.query(productSql, [product_id], (productErr, productResults) => {
    if (productErr) return res.status(500).json({ error: '상품 조회 오류' });
    if (!productResults.length) return res.status(404).json({ error: '상품 없음' });

    const product = productResults[0];

    // 장바구니 중복 확인
    const checkSql = 'SELECT * FROM green_cart WHERE user_id = ? AND product_id = ?';
    connectionGM.query(checkSql, [req.user.id, product_id], (checkErr, checkResults) => {
      if (checkErr) return res.status(500).json({ error: 'DB 오류' });

      if (checkResults.length) {
        return res.status(400).json({ message: '이미 장바구니에 있는 상품입니다.' });
      }

      // 장바구니에 상품 추가
      const insertSql = 
        'INSERT INTO green_cart (user_id, product_id, title, brand, \`condition\`, shipping_fee, price, trade_type, region, image_main, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';

      const params = [
        req.user.id, product_id, product.title, product.brand, product.condition, product.shipping_fee, product.price, product.trade_type, product.region, product.image_main
      ];

      connectionGM.query(insertSql, params, (insertErr) => {
        if (insertErr) return res.status(500).json({ error: '장바구니 추가 실패' });
        res.json({ success: true, message: '장바구니에 상품이 추가되었습니다.' });
      });
    });
  });
});

/* -- 공지사항 -- */
// 공지사항 조회
app.get('/notice', (req, res) => { /* req 삭제시 조회X */
  connectionGM.query('SELECT * FROM green_notice ORDER BY green_notice.id DESC', (err, results) => {
    if(err) {
      console.log('쿼리문 오류 : ', err);
      res.status(500).json({error: 'DB쿼리 오류'});
      return;
    }
    res.json(results);
  });
});

// 공지사항 삭제
app.delete('/notice/:id', (req, res) => {
  const id = req.params.id;
  connectionGM.query('DELETE FROM green_notice WHERE id = ?', [id], (err, result) => {
    if(err) {
      console.log('삭제 오류', err);
      res.status(500).json({error: '게시글 삭제 실패'});
      return;
    }
    res.json({success: true});
  });
});

// 공지사항 수정 (하단 공지사항 수정 참고, GPT 도움)
app.put('/notice/update/:id', (req, res) => {
  const {category, title, content} = req.body;
  const { id } = req.params; /* id값 불러오기 */

  connectionGM.query('UPDATE green_notice SET category = ?, title = ?, content = ? WHERE id = ?', [category, title, content, id],  (err) => {
    if(err) {
      console.log('수정 오류 : ', err);
      res.status(500).json({error: '게시글 수정 실패'});
      return;
    }
    res.json({success: true});
  });
});

// 공지사항 수정을 위한 특정 조회
app.get('/notice/:id', (req, res) => {
  const id = req.params.id;

  connectionGM.query('SELECT * FROM green_notice WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.log('조회 오류 : ', err);
      res.status(500).json({error: '게시글 조회 실패'});
      return;
    }
    if (results.length === 0) {
      res.status(404).json({error: '해당 게시글이 없습니다.'});
      return;
    }
    res.json(results[0]); // 단일 객체만 반환
  });
});

// 공지사항 등록
app.post('/notice', (req, res) => {
  const {category, title, writer, content} = req.body;
  if(!category || !title || !writer || !content) {
    return res.status(400).json({error: '필수 항목이 누락되었습니다. 다시 확인해주세요.'});
  }

  connectionGM.query('INSERT INTO green_notice (category, title, writer, content) VALUES (?, ?, ?, ?)', [category, title, writer, content], (err, result) => {
    if(err) {
      console.log('DB 등록 실패 : ', err);
      res.status(500).json({error: '상품 등록 실패'});
      return;
    }
    res.json({success: true, insertId: result.insertId});
  });
});

//서버실행
app.listen(port, ()=>{
  console.log('Listening...');
  // console.log(`Server running on http://localhost:${port}`);
});
