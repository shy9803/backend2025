const express = require('express'); //express 기본 라우팅
const app = express(); //express 기본 라우팅
const port = 9070;
const cors = require('cors'); //교차출처공유 허용하기 위함
const mysql = require('mysql');  //mysql변수 선언
const bcrypt = require('bcrypt'); // 해시 암호화를 위함
const jwt = require('jsonwebtoken'); // 토큰 생성을 위함
const SECRET_KEY = 'test';

app.use(cors());
app.use(express.json()); //JSON 본문 파싱 미들웨어

//1. mysql 연결 정보 셋팅
const connection = mysql.createConnection({
  host:'database:3306',
  user:'root',
  password:'1234',
  database:'kdt'
});

//2. MYSQL DB접속시 오류가 나면 에러 출력하기, 성공하면 '성공'표시하기
connection.connect((err)=>{
  if(err){
    console.log('MYSQL연결 실패 : ', err);
    return;
  }
  console.log('MYSQL연결 성공');
});

// 3. 로그인 폼에서 post 방식으로 전달받은 데이터를 DB에 조회하여 결과값을 리턴함.
app.post('/login', (req, res) => {
  const {username, password} = req.body;

  connection.query('SELECT * FROM users WHERE username = ?', [username], async(err, result) => {
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
app.post('/register', async(req, res) => {
  const {username, password} = req.body;
  const hash = await bcrypt.hash(password, 10); // 패스워드 hash 암호화

  connection.query(
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
app.post('/login2', (req, res) => {
  const {username, password} = req.body;

  connection.query(
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
app.post('/register2', async(req, res) => {
  const {username, password, tel, email} = req.body;
  const hash = await bcrypt.hash(password, 10);

  connection.query(
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
  connection.query("SELECT * FROM goods ORDER BY goods.g_code DESC", (err, results)=>{
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
  connection.query(
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
  connection.query(
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

  connection.query(
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
  connection.query(
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
  connection.query('SELECT * FROM book_store ORDER BY num DESC', (err, results) => {
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
  connection.query('DELETE FROM book_store WHERE num = ?', [num], (err, result) => {
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

  connection.query(
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

  connection.query(
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

  connection.query(
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
  connection.query(
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

  connection.query(
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

  connection.query(
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

  connection.query(
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
  connection.query(
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
  connection.query(
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

//서버실행
app.listen(port, ()=>{
  console.log('Listening...');
});
