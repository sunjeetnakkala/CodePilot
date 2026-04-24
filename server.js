const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "";
const DB_NAME = process.env.DB_NAME || "codepilot";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const APP_ADMIN_USERNAME = process.env.APP_ADMIN_USERNAME || "admin@codepilot.com";
const APP_ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || "admin";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();

function createSession(user) {
  const token = crypto.randomUUID();
  sessions.set(token, {
    token,
    userID: user.userID,
    email: user.email,
    role: user.role
  });
  return token;
}

function getTokenFromRequest(req) {
  const authorization = req.headers.authorization || "";
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  const headerToken = req.headers["x-auth-token"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }

  return null;
}

function getSessionFromRequest(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return sessions.get(token) || null;
}

function requireAuth(allowedRoles = []) {
  return (req, res, next) => {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.session = session;
    next();
  };
}

// MySQL connection pool
const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

if (!DB_PASS) {
  console.warn("[CodePilot] DB_PASS is empty. If your MySQL user requires a password, set it in .env.");
}

async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "codepilot-frontend" });
});

// ===== AUTHENTICATION =====

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  if (email === APP_ADMIN_USERNAME && password === APP_ADMIN_PASSWORD) {
    const adminSessionUser = {
      userID: 0,
      email: APP_ADMIN_USERNAME,
      role: "ADMIN"
    };

    return res.json({
      success: true,
      message: "Login successful",
      token: createSession(adminSessionUser),
      user: adminSessionUser
    });
  }

  try {
    const conn = await pool.getConnection();
    const [users] = await conn.query("SELECT userID, email, password, role FROM User WHERE email=?", [email]);
    conn.release();

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Login successful
    res.json({
      success: true,
      message: "Login successful",
      token: createSession(user),
      user: {
        userID: user.userID,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("POST /api/login:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== USERS ENDPOINTS =====

app.get("/api/me", requireAuth(), async (req, res) => {
  res.json({
    user: {
      userID: req.session.userID,
      email: req.session.email,
      role: req.session.role
    }
  });
});

app.put("/api/me/password", requireAuth(), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword required" });
  }

  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT password FROM User WHERE userID=?", [req.session.userID]);

    if (rows.length === 0) {
      conn.release();
      return res.status(404).json({ error: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!passwordMatch) {
      conn.release();
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await conn.query("UPDATE User SET password=? WHERE userID=?", [hashedPassword, req.session.userID]);
    conn.release();

    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    console.error("PUT /api/me/password:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/logout", requireAuth(), async (req, res) => {
  sessions.delete(req.session.token);
  res.json({ success: true, message: "Logged out" });
});

app.get("/api/users", requireAuth(["ADMIN"]), async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT userID, email, role, skillLevel, preferredLanguage FROM User");
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("GET /api/users:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  const { email, password, role, skillLevel, preferredLanguage } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: "email, password, and role required" });
  }

  if (role !== "STUDENT" && role !== "MANAGER") {
    return res.status(400).json({ error: "role must be STUDENT or MANAGER" });
  }

  const session = getSessionFromRequest(req);
  if (session && session.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!session && role !== "STUDENT") {
    return res.status(403).json({ error: "Only student signups are allowed without an admin session" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const conn = await pool.getConnection();
    await conn.query(
      "INSERT INTO User (email, password, role, skillLevel, preferredLanguage) VALUES (?, ?, ?, ?, ?)",
      [email, hashedPassword, session ? role : "STUDENT", skillLevel || null, preferredLanguage || null]
    );
    conn.release();
    res.json({ success: true, message: "User created" });
  } catch (err) {
    console.error("POST /api/users:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id", requireAuth(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { email, password, role, skillLevel, preferredLanguage } = req.body;

  if (role !== "STUDENT" && role !== "MANAGER") {
    return res.status(400).json({ error: "role must be STUDENT or MANAGER" });
  }

  try {
    const conn = await pool.getConnection();
    let finalPassword = password;

    if (typeof password === "string" && password.trim() !== "") {
      finalPassword = await bcrypt.hash(password, 10);
    } else {
      const [existingRows] = await conn.query("SELECT password FROM User WHERE userID=?", [id]);
      if (existingRows.length === 0) {
        conn.release();
        return res.status(404).json({ error: "User not found" });
      }
      finalPassword = existingRows[0].password;
    }

    await conn.query(
      "UPDATE User SET email=?, password=?, role=?, skillLevel=?, preferredLanguage=? WHERE userID=?",
      [email, finalPassword, role, skillLevel || null, preferredLanguage || null, id]
    );
    conn.release();
    res.json({ success: true, message: "User updated" });
  } catch (err) {
    console.error("PUT /api/users:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", requireAuth(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  try {
    await withTransaction(async (conn) => {
      const [sessions] = await conn.query("SELECT sessionID FROM AIChatSession WHERE userID=?", [id]);
      const sessionIds = sessions.map((session) => session.sessionID);

      if (sessionIds.length > 0) {
        await conn.query("DELETE FROM ChatMessage WHERE sessionID IN (?)", [sessionIds]);
        await conn.query("DELETE FROM AIChatSession WHERE userID=?", [id]);
      }

      await conn.query("DELETE FROM ContentFlag WHERE userID=?", [id]);
      await conn.query("DELETE FROM UserEnrollment WHERE userID=?", [id]);
      await conn.query("DELETE FROM ProgressRecord WHERE userID=?", [id]);
      await conn.query("DELETE FROM User WHERE userID=?", [id]);
    });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("DELETE /api/users:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== LEARNING PATHS ENDPOINTS =====

app.get("/api/learning-paths", requireAuth(["STUDENT", "MANAGER", "ADMIN"]), async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM LearningPath");
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("GET /api/learning-paths:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/learning-paths", requireAuth(["ADMIN"]), async (req, res) => {
  const { pathName, description, difficulty, estimatedHours } = req.body;
  if (!pathName) {
    return res.status(400).json({ error: "pathName required" });
  }
  try {
    const conn = await pool.getConnection();
    await conn.query(
      "INSERT INTO LearningPath (pathName, description, difficulty, estimatedHours) VALUES (?, ?, ?, ?)",
      [pathName, description || null, difficulty || null, estimatedHours || null]
    );
    conn.release();
    res.json({ success: true, message: "Learning path created" });
  } catch (err) {
    console.error("POST /api/learning-paths:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/learning-paths/:id", requireAuth(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { pathName, description, difficulty, estimatedHours } = req.body;
  try {
    const conn = await pool.getConnection();
    await conn.query(
      "UPDATE LearningPath SET pathName=?, description=?, difficulty=?, estimatedHours=? WHERE pathID=?",
      [pathName, description || null, difficulty || null, estimatedHours || null, id]
    );
    conn.release();
    res.json({ success: true, message: "Learning path updated" });
  } catch (err) {
    console.error("PUT /api/learning-paths:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/learning-paths/:id", requireAuth(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  try {
    await withTransaction(async (conn) => {
      const [lessons] = await conn.query("SELECT lessonID FROM Lesson WHERE pathID=?", [id]);
      const lessonIds = lessons.map((lesson) => lesson.lessonID);

      if (lessonIds.length > 0) {
        const [sessions] = await conn.query(
          "SELECT sessionID FROM AIChatSession WHERE lessonID IN (?)",
          [lessonIds]
        );
        const sessionIds = sessions.map((session) => session.sessionID);

        if (sessionIds.length > 0) {
          await conn.query("DELETE FROM ChatMessage WHERE sessionID IN (?)", [sessionIds]);
          await conn.query("DELETE FROM AIChatSession WHERE sessionID IN (?)", [sessionIds]);
        }

        await conn.query("DELETE FROM PracticeCodingChallenge WHERE lessonID IN (?)", [lessonIds]);
        await conn.query("DELETE FROM Quiz WHERE lessonID IN (?)", [lessonIds]);
        await conn.query("DELETE FROM ProgressRecord WHERE lessonID IN (?)", [lessonIds]);
        await conn.query("DELETE FROM Lesson WHERE lessonID IN (?)", [lessonIds]);
      }

      await conn.query("DELETE FROM UserEnrollment WHERE pathID=?", [id]);
      await conn.query("DELETE FROM LearningPath WHERE pathID=?", [id]);
    });
    res.json({ success: true, message: "Learning path deleted" });
  } catch (err) {
    console.error("DELETE /api/learning-paths:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== LESSONS ENDPOINTS =====

app.get("/api/lessons", requireAuth(["STUDENT", "MANAGER", "ADMIN"]), async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM Lesson");
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("GET /api/lessons:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/lessons", requireAuth(["ADMIN"]), async (req, res) => {
  const { pathID, title, content } = req.body;
  if (!pathID || !title) {
    return res.status(400).json({ error: "pathID and title required" });
  }
  try {
    const conn = await pool.getConnection();
    await conn.query(
      "INSERT INTO Lesson (pathID, title, content) VALUES (?, ?, ?)",
      [pathID, title, content || null]
    );
    conn.release();
    res.json({ success: true, message: "Lesson created" });
  } catch (err) {
    console.error("POST /api/lessons:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/lessons/:id", requireAuth(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { pathID, title, content } = req.body;
  try {
    const conn = await pool.getConnection();
    await conn.query(
      "UPDATE Lesson SET pathID=?, title=?, content=? WHERE lessonID=?",
      [pathID, title, content || null, id]
    );
    conn.release();
    res.json({ success: true, message: "Lesson updated" });
  } catch (err) {
    console.error("PUT /api/lessons:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/lessons/:id", requireAuth(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  try {
    await withTransaction(async (conn) => {
      const [sessions] = await conn.query("SELECT sessionID FROM AIChatSession WHERE lessonID=?", [id]);
      const sessionIds = sessions.map((session) => session.sessionID);

      if (sessionIds.length > 0) {
        await conn.query("DELETE FROM ChatMessage WHERE sessionID IN (?)", [sessionIds]);
        await conn.query("DELETE FROM AIChatSession WHERE lessonID=?", [id]);
      }

      await conn.query("DELETE FROM PracticeCodingChallenge WHERE lessonID=?", [id]);
      await conn.query("DELETE FROM Quiz WHERE lessonID=?", [id]);
      await conn.query("DELETE FROM ProgressRecord WHERE lessonID=?", [id]);
      await conn.query("DELETE FROM Lesson WHERE lessonID=?", [id]);
    });
    res.json({ success: true, message: "Lesson deleted" });
  } catch (err) {
    console.error("DELETE /api/lessons:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== CHAT SESSIONS ENDPOINTS =====

app.get("/api/chat-sessions", requireAuth(["MANAGER", "ADMIN"]), async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM AIChatSession");
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("GET /api/chat-sessions:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== MODERATION FLAGS ENDPOINTS =====

app.get("/api/moderation/flags", requireAuth(["MANAGER", "ADMIN"]), async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM ContentFlag");
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("GET /api/moderation/flags:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/moderation/flags/:id", requireAuth(["MANAGER", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { status, description } = req.body;
  try {
    const conn = await pool.getConnection();
    await conn.query(
      "UPDATE ContentFlag SET status=?, description=? WHERE flagID=?",
      [status, description || null, id]
    );
    conn.release();
    res.json({ success: true, message: "Flag updated" });
  } catch (err) {
    console.error("PUT /api/moderation/flags:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== REPORTS (joins / aggregation) =====

app.get("/api/reports/student-progress", requireAuth(["MANAGER", "ADMIN"]), async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT u.email AS studentEmail,
              lp.pathName AS learningPath,
              l.title AS lessonTitle,
              pr.attempts,
              pr.timeSpent,
              pr.score,
              CASE
                WHEN pr.score IS NULL THEN 'No score yet'
                WHEN pr.score >= 80 THEN 'Strong'
                WHEN pr.score >= 60 THEN 'Developing'
                ELSE 'Needs support'
              END AS progressLabel
       FROM ProgressRecord pr
       INNER JOIN User u ON u.userID = pr.userID
       INNER JOIN Lesson l ON l.lessonID = pr.lessonID
       INNER JOIN LearningPath lp ON lp.pathID = l.pathID
       ORDER BY u.email, lp.pathName, l.title`
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("GET /api/reports/student-progress:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/path-enrollment", requireAuth(["MANAGER", "ADMIN"]), async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT lp.pathName,
              COUNT(ue.enrollmentID) AS enrolledStudents
       FROM LearningPath lp
       LEFT JOIN UserEnrollment ue ON ue.pathID = lp.pathID
       GROUP BY lp.pathID, lp.pathName
       ORDER BY enrolledStudents DESC, lp.pathName`
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("GET /api/reports/path-enrollment:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function startServer() {
  app.listen(PORT, () => {
    console.log(`CodePilot frontend running on http://localhost:${PORT}`);
    console.log(`[CodePilot] DB target: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start CodePilot", error);
  process.exit(1);
});
