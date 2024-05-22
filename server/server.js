require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 5001;

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// 게시글을 MySQL에서 삭제하는 엔드포인트
app.delete('/api/delete/:postId', (req, res) => {
  const { postId } = req.params;

  const query = 'DELETE FROM posts WHERE postId = ?';
  db.query(query, [postId], (err, result) => {
    if (err) {
      console.error('Error deleting post:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Post deleted successfully:', result);
      res.status(200).send({ message: 'Post deleted successfully' });
    }
  });
});

// 게시글을 MySQL에서 업데이트하는 엔드포인트
app.put('/api/update/:postId', (req, res) => {
  const { postId } = req.params;
  const { id, title, content } = req.body;

  const query = 'UPDATE posts SET id = ?, title = ?, content = ? WHERE postId = ?';
  db.query(query, [id, title, content, postId], (err, result) => {
    if (err) {
      console.error('Error updating post:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Post updated successfully:', result);
      res.status(200).send({ message: 'Post updated successfully' });
    }
  });
});

// postId를 이용하여 해당하는 게시글을 조회하는 엔드포인트
app.get('/api/posts/:postId', (req, res) => {
  const { postId } = req.params;

  const query = 'SELECT * FROM posts WHERE postId = ?';
  db.query(query, [postId], (err, result) => {
    if (err) {
      console.error('Error fetching post:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      if (result.length > 0) {
        // 조회된 게시글이 있으면 첫 번째 게시글 반환
        res.status(200).send(result[0]);
      } else {
        // 조회된 게시글이 없으면 404 에러 반환
        res.status(404).send({ error: 'Post not found' });
      }
    }
  });
});

// 최신 게시글부터 가져오는 엔드포인트
app.get('/api/newsList', (req, res) => {
  const query = 'SELECT * FROM posts ORDER BY postId DESC'; // id를 기준으로 내림차순 정렬

  db.query(query, (err, result) => {
      if (err) {
          console.error('Error fetching posts:', err);
          res.status(500).send({ error: 'Internal server error' });
      } else {
          console.log('Posts fetched successfully:', result);
          res.status(200).send(result);
      }
  });
});

// 게시글을 MySQL에 저장하는 엔드포인트
app.post('/api/write', (req, res) => {
  const { id, title, content} = req.body;

  const query = 'INSERT INTO posts (id, title, content) VALUES (?, ?, ?)';
  db.query(query, [id, title, content], (err, result) => {
      if (err) {
          console.error('Error saving post:', err);
          res.status(500).send({ error: 'Internal server error' });
      } else {
          console.log('Post saved successfully:', result);
          res.status(200).send({ message: 'Post saved successfully' });
      }
  });
});


// 로그아웃
app.post('/api/user/logout', (req, res) => {
  // 현재 로그인한 사용자의 아이디를 추출합니다.
  const userId = req.cookies.user.id;
  
  // 로그인 테이블에서 해당 사용자의 정보를 삭제합니다.
  const deleteQuery = 'DELETE FROM login WHERE id = ?';
  db.query(deleteQuery, [userId], (err, result) => {
    if (err) {
      console.error('Error deleting login info:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Login info deleted successfully for user:', userId);
      res.status(200).send({ message: 'Logout successful' });
    }
  });
});
// 로그인 하기
app.post('/api/user/login', (req, res) => {
  const { id, pw } = req.body;
  const sqlQuery = 'SELECT * FROM user WHERE id = ? AND pw = ?';
  db.query(sqlQuery, [id, pw], (err, result) => {
    if (err) {
      console.error('Error logging in:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      if (result.length > 0) {
        res.status(200).send({ message: 'Login successful', user: result[0] });
      } else {
        res.status(401).send({ error: 'Invalid credentials' });
      }
    }
  });
});
// 중복된 아이디 체크 
app.post('/api/user/check', (req, res) => {
  const { id } = req.body;
  const sqlQuery = 'SELECT * FROM user WHERE id = ?';
  db.query(sqlQuery, id, (err, result) => {
    if (err) {
      console.error('Error checking duplicate id:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      if (result.length > 0) {
        res.send({ exists: true });
      } else {
        res.send({ exists: false });
      }
    }
  });
});
//회원가입 등록하기
app.post('/api/user/join',(reg, res)=>{
  const {name, phone, id , pw, pwCon } = reg.body;
  const sqlQuery = `INSERT INTO user (name, phone, id, pw, pwCon) VALUES (?,?,?,?,?)`;
  const values = [name, phone, id, pw, pwCon];
  db.query(sqlQuery, values, (err)=>{
    if(err){
      console.err('Error saving data:',err);
      res.status(500).send({error: 'Internal server error'});
    }else {
      console.log('Data saved successfully:', values);
      res.status(200).send({message: 'Data saved successfully'});
    }
  } )
})

//오늘 레슨한 학생 이름 가져오기
app.get('/api/lessonList/today', (req, res) => {
  const { date, userId } = req.query; // 요청의 쿼리 파라미터에서 날짜와 사용자 ID를 가져옴
  let sqlQuery = 'SELECT name FROM lessonList WHERE DATE(lessonDay) = ? AND userId = ?';
  const values = [date, userId];

  db.query(sqlQuery, values, (err, result) => {
    if (err) {
      console.error('Error fetching today\'s lessons:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      res.status(200).send(result);
    }
  });
});


//결제후 레슨 충전하기
app.put('/api/member/charge/:name', (req, res) => {
  const memberName = req.params.name;
  const userId = req.query.userId;

  const lessonCount = parseInt(req.body.lesson); // 충전할 레슨 수
  const sqlQuery = `UPDATE member SET lesson = lesson + ? WHERE name = ? AND userId = ?`;
  const values = [lessonCount, memberName, userId];

  db.query(sqlQuery, values, (err) => {
    if (err) {
      console.error('Error increasing member lesson:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Member lesson increased successfully');
      res.status(200).send({ message: 'Member lesson increased successfully' });
    }
  });
});
// 맴버 이름으로 핸드폰 번호 세부정보 등록
app.get('/api/member/detail/:name', (req, res) => {
  const { name } = req.params;
  const { userId } = req.query; // 사용자 ID를 쿼리 파라미터로 받음
  const sqlQuery = 'SELECT * FROM member WHERE name = ? AND userId = ?';
  const values = [name, userId];
  
  db.query(sqlQuery, values, (err, result) => {
    if (err) {
      console.error('Error fetching member data:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Member data fetched successfully');
      res.status(200).send(result[0]); // 첫 번째 결과만 반환 (단일 객체)
    }
  });
});
// 레슨생 세부정보 결제현황
app.get('/api/payList/detail/:name', (req, res) => {
  const { name } = req.params;
  const { userId } = req.query; // 사용자 ID를 쿼리 파라미터로 받음
  const sqlQuery = 'SELECT * FROM payList WHERE name = ? AND userId = ?';
  const values = [name, userId];

  db.query(sqlQuery, values, (err, result) => {
    if (err) {
      console.error('Error fetching pay list:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Pay list fetched successfully');
      res.status(200).send(result);
    }
  });
});

// 레슨생 세부정보 레슨현황
app.get('/api/lessonList/detail/:name', (req, res) => {
  const { name } = req.params;
  const { userId } = req.query; // 사용자 ID를 쿼리 파라미터로 받음
  const sqlQuery = 'SELECT * FROM lessonList WHERE name = ? AND userId = ?';
  const values = [name, userId];

  db.query(sqlQuery, values, (err, result) => {
    if (err) {
      console.error('Error fetching lesson list:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Lesson list fetched successfully');
      res.status(200).send(result);
    }
  });
});
// 선택한 월의 결제 현황만 보임
app.get('/api/payListmonth', (req, res) => {
  const { month, userId } = req.query; // 선택한 월과 사용자 ID를 쿼리 파라미터로 받음


  let sqlQuery = `SELECT * FROM payList WHERE MONTH(payDay) = ? AND userId = ?`;
  const values = [month, userId];

  db.query(sqlQuery, values, (err, result) => {
    if (err) {
      console.error('Error fetching pay list:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      res.status(200).send(result);
    }
  });
});
//결제 완료한 내역 리스트에 추가
app.post('/api/payList', (req, res) => {
  const {userId, name, pay } = req.body;
  const sqlQuery = `INSERT INTO payList (userId, name, pay ) VALUES (?,?,?)`;
  const values = [userId, name,pay ];

  db.query(sqlQuery, values, (err) => {
    if (err) {
      console.error('Error saving payment data:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Payment data saved successfully:', values);
      res.status(200).send({ message: 'Payment data saved successfully' });
    }
  });
});
//선택한 월의 레슨만 보이게
app.get('/api/lessonListmonth', (req, res) => {
  const { month, userId } = req.query; // 선택한 월과 사용자 ID를 쿼리 파라미터로 받음

  const sqlQuery = 'SELECT * FROM lessonList WHERE MONTH(lessonDay) = ? AND userId = ?';
  const values = [month, userId];

  db.query(sqlQuery, values, (err, result) => {
    if (err) {
      console.error('Error fetching lesson list:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      res.status(200).send(result);
    }
  });
});

//레슨 리스트에서도 수업 삭제해주기
app.delete('/api/lessonList/:name', (req, res) => {
  const { name } = req.params;
  const { userId } = req.query; // userId를 쿼리 파라미터로 받음

  const sqlQuery = 'DELETE FROM lessonList WHERE name = ? AND userId = ? ORDER BY lessonDay DESC LIMIT 1';
  const values = [name, userId];
  db.query(sqlQuery, values, (err) => {
    if (err) {
      console.error('Error deleting lesson data:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Lesson data deleted successfully for:', name);
      res.status(200).send({ message: 'Lesson data deleted successfully' });
    }
  });
});
//레슨 후 수업 완료 버튼 레슨리스트에 추가하기
app.post('/api/lessonList', (req, res) => {
  const { userId ,name, phone} = req.body;
  const sqlQuery = `INSERT INTO lessonList (userId, name, phone) VALUES (?, ?, ?)`;
  const values = [userId, name, phone];

  db.query(sqlQuery, values, (err) => {
    if (err) {
      console.error('Error saving lesson data:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Lesson data saved successfully:', values);
      res.status(200).send({ message: 'Lesson data saved successfully' });
    }
  });
});
//그만둔 학원생 삭제하기
app.delete('/api/member/:name', (req, res) => {
  const memberName = req.params.name;
  const { userId } = req.query; // userId를 쿼리 파라미터로 받음

  const sqlQuery = 'DELETE FROM member WHERE name = ? AND userId = ?';
  const values = [memberName, userId];
  db.query(sqlQuery, values, (err) => {
    if (err) {
      console.error('Error deleting member:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Member deleted successfully:', memberName);
      res.status(200).send({ message: 'Member deleted successfully' });
    }
  });
});

//레슨 1회 증가시키기 수업 취소
app.put('/api/member/cancel/:name', (req, res) => {
  const memberName = req.params.name;
  const { userId } = req.query; // userId를 쿼리 파라미터로 받음
  const sqlQuery = 'UPDATE member SET lesson = lesson + 1 WHERE name = ? AND userId = ?';
  const values = [memberName, userId];
  db.query(sqlQuery, values, (err) => {
    if (err) {
      console.error('Error increasing member lesson:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Member lesson increased successfully');
      res.status(200).send({ message: 'Member lesson increased successfully' });
    }
  });
});
//수업 후 레슨 수 -1 수업 완료
app.put('/api/member/:name', (req, res) => {
  const memberName = req.params.name;
  const { userId } = req.query; // userId를 쿼리 파라미터로 받음
  const { lesson } = req.body;
  const sqlQuery = 'UPDATE member SET lesson = ? WHERE name = ? AND userId = ?';
  const values = [lesson, memberName, userId];


  db.query(sqlQuery, values, (err) => {
    if (err) {
      console.error('Error updating lesson data:', err);
      res.status(500).send({ error: 'Internal server error' });
    } else {
      console.log('Lesson data updated successfully:', values);
      res.status(200).send({ message: 'Lesson data updated successfully' });
    }
  });
});

//레슨생 모두 불러오기
app.get('/api/member', (req, res) => {
  const { userId } = req.query;
    const sqlQuery = 'SELECT * FROM member WHERE userId = ?';
    const values = [userId];
    db.query(sqlQuery, values, (err, result) => {
      if (err) {
        console.error('Error fetching member data:', err);
        res.status(500).send({ error: 'Internal server error' });
      } else {
        console.log('Member data fetched successfully');
        res.status(200).send(result);
      }
    });
  });

  // 레슨생 등록하기
app.post('/api/member', (req, res) => {
    const {userId, name, phone, lesson } = req.body;
    const sqlQuery = `INSERT INTO member (userId, name, phone, lesson) VALUES ( ?, ?, ?, ?)`;
    const values = [userId, name, phone, lesson];
  
    db.query(sqlQuery, values, (err) => {
      if (err) {
        console.error('Error saving data:', err);
        res.status(500).send({ error: 'Internal server error' });
      } else {
        console.log('Data saved successfully:', values);
        res.status(200).send({ message: 'Data saved successfully' });
      }
    });
  });
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});