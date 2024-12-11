const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer')

// ENV
require('dotenv').config();

const app = express();
const port = 3500;

// EJS
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use("/css", express.static("dist"))

// ตั้งค่า Body parser
app.use(express.urlencoded({ extended: true }));  
app.use(express.json()); 

// ให้ Express ให้บริการไฟล์ static (เช่น output.css)
app.use(express.static(path.join(__dirname, 'src')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// เชื่อมต่อกับฐานข้อมูล MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // Default 3306
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to database');
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // เก็บไฟล์ในโฟลเดอร์ uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // ตั้งชื่อไฟล์ไม่ให้ซ้ำ
  }
});

const upload = multer({ storage });

app.get('/', (req, res) => {
  res.redirect("/home");
});

app.get('/home', (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post('/register', (req, res) => {
  const { fullname, username, password, email, phone } = req.body;
  const query = 'INSERT INTO accounts (fullname, username, password, email, phone) VALUES (?, ?, ?, ?, ?)';
  
  db.query(query, [fullname, username, password, email, phone], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      res.status(500).send('Error saving data to the database');
    } else {
      console.log('Data inserted:', result);
      res.redirect('/login');
    }
  });
});

app.post('/home', upload.single('image'), (req, res) => {
  const { name, address, details, animal, health, sterilization } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const query = `
    INSERT INTO animals (name, address, details, animal_type, health_status, sterilization_status, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [name, address, details, animal, health, sterilization, imageUrl],
    (err, result) => {
      if (err) {
        console.error('Error saving to database:', err);
        res.status(500).send('Error saving data');
      } else {
        console.log('Data saved successfully:', result);
        res.redirect('/home');
      }
    }
  );
});


// เริ่มต้น server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
