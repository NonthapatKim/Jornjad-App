const express = require("express");
const session = require("express-session");
const mysql = require("mysql2");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");

// UUID
const { v4: uuidv4 } = require("uuid");

// Hash Password
const bcrypt = require("bcrypt");

// ENV
require("dotenv").config();

const app = express();
const port = 8591;

// EJS
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use("/css", express.static("dist"));

// ตั้งค่า Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

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

function sendmail(toemail, subject, html) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail",
    auth: {
      user: process.env.EMAIL_NAME,
      pass: process.env.EMAIL_PASSCODE,
    },
  });

  // send mail with defined transport object
  let mailOptions = {
    from: '"COSCI - Test mail" <65.285kansinee@gmail.com>', // sender address
    to: toemail, // list of receivers
    subject: subject, // Subject line
    // text: textMail
    html: html, // html mail body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.send("เกิดข้อผิดพลาด ไม่สามารถส่งอีเมลได้ โปรดลองใหม่ภายหลัง");
    } else {
      // console.log('INFO EMAIL:', info);
      console.log("send email successful");
    }
  });
}

app.use((req, res, next) => {
  res.locals.currentUrl = req.originalUrl;
  next();
});

app.get("/", (req, res) => {
  res.redirect("/home");
});

app.get("/home", (req, res) => {
  res.render("index", { session: req.session });
});

app.get("/care", (req, res) => {
  res.render("care", { session: req.session });
});

app.get("/foundation", (req, res) => {
  res.render("foundation", { session: req.session });
});

app.get("/maps", (req, res) => {
  res.render("maps", { session: req.session });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/geo-test", (req, res) => {
  res.render("geo-test");
});

app.get("/checkforgot", (req, res) => {
  res.render("forgotPassword");
});

app.get("/checkLogin", (req, res) => {
  res.render("login_forgot");
});

app.get("/changepassword", (req, res) => {
  res.render("edit");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const checkQuery = "SELECT * FROM accounts WHERE username = ? OR email = ?";
  db.query(checkQuery, [username, username], async (err, result) => {
    if (err) {
      console.error("Error checking existing user:", err);
      return res.status(500).send("Error checking user in the database");
    }

    if (result.length === 0) {
      return res
        .status(400)
        .send("ชื่อผู้ใช้งาน หรือ อีเมล หรือ รหัสผ่านไม่ถูกต้อง");
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
        (updateErr) => {
          if (updateErr) {
            console.error("Error updating last active time:", updateErr);
            return res.status(500).send("Error updating last active time");
          }

          return res.status(200).json("Login successful");
        }
      );
    } else {
      return res
        .status(401)
        .json("ชื่อผู้ใช้งาน หรือ อีเมล หรือ รหัสผ่านไม่ถูกต้อง");
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

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    res.redirect("/login");
  });
});

app.post("/add-animal", upload.single("image"), (req, res) => {
  const {
    name = null,
    address = null,
    lat = null,
    lon = null,
    details = null,
    animal = null,
    health = null,
    sterilization = null,
  } = req.body;

  const finalDetails = details === "" ? null : details;
  const finalName = name === "" ? null : name;
  const finalAddress = address === "" ? null : address;
  const finalLat = lat === "" ? null : lat;
  const finalLon = lon === "" ? null : lon;
  const finalAnimal = animal === "" ? null : animal;
  const finalHealth = health === "" ? null : health;
  const finalSterilization = sterilization === "" ? null : sterilization;

  const id = uuidv4();
  let imageUrl = null;

  if (req.file) {
    const extension = path.extname(req.file.originalname);
    imageUrl = `${id}${extension}`;
    const newFilePath = path.join(req.file.destination, imageUrl);

    fs.renameSync(req.file.path, newFilePath);
  }

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
      imageUrl,
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
  });
});

app.get("/get-animal/:id", (req, res) => {
  const id = req.params.id;

  const query = "SELECT * FROM animals WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error checking marker data:", err);
      return res.status(500).send("Error checking marker in the database");
    }

    return res.status(200).json(result);
  });
});

// Handle login authentication
app.post("/checklogin", async (req, res) => {
  const { username, password } = req.body;

  if (username && password) {
    db.query(
      "SELECT * FROM accounts WHERE username = ?",
      [username],
      async (err, results) => {
        if (err) {
          console.error("Database connection error:", err);
          return res.render("index_error", {
            message: "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล",
            id: username,
          });
        }

        if (results.length > 0) {
          try {
            // Use bcrypt.compare with async/await
            const isMatch = await bcrypt.compare(password, results[0].password);

            if (isMatch) {
              req.session.loggedin = true;
              req.session.username = username;
              res.redirect("/changepassword");
            } else {
              res.render("index_error", {
                message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
                id: username,
              });
            }
          } catch (err) {
            console.error("Password comparison error:", err);
            return res.render("index_error", {
              message: "เกิดข้อผิดพลาดในการเปรียบเทียบรหัสผ่าน",
              id: username,
            });
          }
        } else {
          res.render("index_error", {
            message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            id: username,
          });
        }
      }
    );
  } else {
    res.render("index_error", {
      message: "โปรดใส่ข้อมูลให้ครบถ้วน!!",
      id: username,
    });
  }
});

app.post("/changepassword", async (req, res) => {
  const { newPassword, retypePassword } = req.body;

  // ตรวจสอบว่ารหัสผ่านทั้งสองช่องตรงกันหรือไม่
  if (!newPassword || !retypePassword) {
    return res.status(400).json({
      message: "โปรดกรอกข้อมูลให้ครบถ้วน",
      redirect: false,
    });
  }

  if (newPassword !== retypePassword) {
    return res.status(400).json({
      message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
      redirect: false,
    });
  }

  try {
    // Hash รหัสผ่านใหม่
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // สมมติว่าคุณดึง username จาก session
    const username = req.session.username;

    if (!username) {
      return res.status(401).json({
        message: "ไม่ได้เข้าสู่ระบบ โปรดเข้าสู่ระบบก่อนทำการเปลี่ยนรหัสผ่าน",
        redirect: "/login",
      });
    }

    // อัปเดตรหัสผ่านในฐานข้อมูล
    db.query(
      "UPDATE accounts SET password = ? WHERE username = ?",
      [hashedPassword, username],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน",
            redirect: false,
          });
        }

        if (results.affectedRows > 0) {
          req.session.message = "เปลี่ยนรหัสผ่านสำเร็จ";
          res.redirect("/login");
        } else {
          return res.status(400).json({
            message: "ไม่พบผู้ใช้ที่ต้องการเปลี่ยนรหัสผ่าน",
            redirect: false,
          });
        }
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "เกิดข้อผิดพลาดทางเซิร์ฟเวอร์",
      redirect: false,
    });
  }
});

app.post("/checkforgot", async (req, res) => {
  const username = req.body.username;

  if (username) {
    db.query(
      "SELECT * FROM accounts WHERE username = ?",
      [username],
      async (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).send("Database error");
        }

        if (rows.length > 0) {
          const randomPass = Math.random().toString(36).substring(2, 10);
          const email = rows[0].email;
          const subject = "Password Reset Request";
          const html = `สวัสดี คุณ ${rows[0].username}<br>รหัสผ่านใหม่ของคุณ คือ &nbsp;${randomPass}`;

          sendmail(email, subject, html);

          try {
            const hashedPass = await bcrypt.hash(randomPass, 10);

            db.query(
              "UPDATE accounts SET password = ? WHERE username = ?",
              [hashedPass, username],
              (err) => {
                if (err) {
                  console.error("Update error:", err);
                  return res.status(500).send("Update error");
                }

                res.render("index_forgotpass", {
                  message: `รหัสผ่านใหม่ได้ถูกส่งไปยังอีเมลของคุณ "${email}". โปรดตรวจสอบอีเมลของคุณ`,
                  vhf1: "hidden", // Add this to pass vhf1
                  vhf2: "visible", // Add this to pass vhf2
                });
              }
            );
          } catch (err) {
            console.error("Hashing error:", err);
            return res.status(500).send("Internal error");
          }
        } else {
          res.render("index_forgotpass", {
            message: "ไม่พบชื่อผู้ใช้นี้",
            vhf1: "visible",
            vhf2: "hidden",
          });
        }
      }
    );
  } else {
    res.render("index_forgotpass", {
      message: "โปรดใส่ชื่อผู้ใช้",
      vhf1: "visible",
      vhf2: "hidden",
    });
  }
});

// เริ่มต้น server
app.listen(port, () => {
  console.log(`Server running at: ${port}`);
});
