const express = require("express");
const session = require('express-session');
const mysql = require("mysql2");
const path = require("path");
const multer = require("multer");

// UUID
const { v4: uuidv4 } = require("uuid");

// Hash Password
const bcrypt = require("bcrypt");

// ENV
require("dotenv").config();

const app = express();
const port = 3500;

// EJS
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use("/css", express.static("dist"));

// ตั้งค่า Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, 
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// ให้ Express ให้บริการไฟล์ static (เช่น output.css)
app.use(express.static(path.join(__dirname, "src")));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// เชื่อมต่อกับฐานข้อมูล MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // Default 3306
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to database");
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // เก็บไฟล์ในโฟลเดอร์ uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // ตั้งชื่อไฟล์ไม่ให้ซ้ำ
  },
});

const upload = multer({ storage });

app.use((req, res, next) => {
  res.locals.currentUrl = req.originalUrl;
  next();
});

app.get("/", (req, res) => {
  res.redirect("/home");
});

app.get("/home", (req, res) => {
  res.render('index', { session: req.session });
});

app.get("/care", (req, res) => {
  res.render('care', { session: req.session });
})

app.get("/foundation", (req, res) => {
  res.render('foundation', { session: req.session });
})

app.get("/maps", (req, res) => {
  res.render('maps', { session: req.session });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/geo-test", (req, res) => {
  res.render("geo-test")
})

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const checkQuery = "SELECT * FROM accounts WHERE username = ? OR email = ?";
  db.query(checkQuery, [username, username], async (err, result) => {
    if (err) {
      console.error("Error checking existing user:", err);
      return res.status(500).send("Error checking user in the database");
    }
    
    if (result.length === 0) {
      return res.status(400).send("ชื่อผู้ใช้งาน หรือ อีเมล หรือรหัสผ่านไม่ถูกต้อง");
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      req.session.username = user.username;
      req.session.userId = user.id;

      const currentDate = new Date();

      db.query(
        "UPDATE accounts SET last_actived_at = ? WHERE id = ?", 
        [currentDate, user.id],
        (updateErr, updateResult) => {
          if (updateErr) {
            console.error("Error updating last active time:", updateErr);
            return res.status(500).send("Error updating last active time");
          }

          return res.status(200).json({ message: "Login successful" });
        }
      );
    } else {
      return res.status(401).json({ message: "ชื่อผู้ใช้งาน หรือ อีเมล หรือรหัสผ่านไม่ถูกต้อง" });
    }
  });
});

app.post("/register", (req, res) => {
  const { fullname, username, password, email, phonenumber } = req.body;

  const checkQuery = "SELECT * FROM accounts WHERE username = ? OR email = ?";
  db.query(checkQuery, [username, email], async (err, results) => {
    if (err) {
      console.error("Error checking existing user:", err);
      return res.status(500).send("Error checking user in the database");
    }
    if (results.length > 0) {
      return res
        .status(400)
        .send("ชื่อผู้ใช้งาน หรือ อีเมล มีอยู่ในระบบอยู่แล้ว");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const insertQuery =
      "INSERT INTO accounts (id, fullname, username, password, email, phonenumber) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(
      insertQuery,
      [id, fullname, username, hashedPassword, email, phonenumber],
      (err, result) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).send("Error saving data to the database");
        }

        return res.status(200).json({ message: "Registration successful" });
      }
    );
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          return res.status(500).json({ message: 'Error logging out' });
      }
      res.redirect('/');
  });
});

app.post("/add-animal", upload.single("image"), (req, res) => {
  // ตรวจสอบและตั้งค่าเป็น null หากค่าของฟิลด์เป็นค่าว่าง
  const {
    name = null,
    address = null,
    lat = null,
    lon = null,
    details = null,
    animal = null,
    health = null,
    sterilization = null
  } = req.body;

  // หากค่าที่ส่งมาคือค่าว่าง ให้เปลี่ยนเป็น null
  const finalDetails = details === "" ? null : details;
  const finalName = name === "" ? null : name;
  const finalAddress = address === "" ? null : address;
  const finalLat = lat === "" ? null : lat;
  const finalLon = lon === "" ? null : lon;
  const finalAnimal = animal === "" ? null : animal;
  const finalHealth = health === "" ? null : health;
  const finalSterilization = sterilization === "" ? null : sterilization;

  // สร้าง id และตรวจสอบว่าไฟล์ถูกอัปโหลดหรือไม่
  const id = uuidv4();
  const originalFilename = req.file ? req.file.filename : null;
  const [filename, extension] = originalFilename.split('.');
  const imageUrl = req.file ? `${id}.${extension}` : null;

  const query = `
    INSERT INTO animals (
      id, 
      name, 
      address, 
      latitude, 
      longitude, 
      details, 
      animal_type, 
      health_status, 
      sterilization_status, 
      image
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // ใช้ db.query เพื่อบันทึกข้อมูลลงฐานข้อมูล
  db.query(
    query,
    [
      id,
      finalName,
      finalAddress,
      finalLat,
      finalLon,
      finalDetails,
      finalAnimal,
      finalHealth,
      finalSterilization,
      imageUrl
    ],
    (err) => {
      if (err) {
        console.error("Error saving to database:", err);
        return res.status(500).json({ message: "Error saving data" });
      } else {
        return res.status(200).json({ message: "Data saved successfully" });
      }
    }
  );
});

app.get("/get-animal", (req, res) => {
  const query = "SELECT * FROM animals";
  db.query(query, (err, result) => {
    if (err) {
      console.error("Error checking marker data:", err);
      return res.status(500).send("Error checking marker in the database");
    }

    return res.status(200).json(result);
  })
})

app.get("/get-animal/:id", (req, res) => {

  const id = req.params.id

  const query = "SELECT * FROM animals WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error checking marker data:", err);
      return res.status(500).send("Error checking marker in the database");
    }

    return res.status(200).json(result);
  })
})

// เริ่มต้น server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
