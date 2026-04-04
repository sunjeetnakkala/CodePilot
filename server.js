const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "";
const DB_NAME = process.env.DB_NAME || "codepilot";
const DB_PORT = Number(process.env.DB_PORT || 3306);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

// ===== USERS ENDPOINTS =====

app.get("/api/users", async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM User");
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
  try {
    const conn = await pool.getConnection();
    await conn.query(
      "INSERT INTO User (email, password, role, skillLevel, preferredLanguage) VALUES (?, ?, ?, ?, ?)",
      [email, password, role, skillLevel || null, preferredLanguage || null]
    );
    conn.release();
    res.json({ success: true, message: "User created" });
  } catch (err) {
    console.error("POST /api/users:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { email, password, role, skillLevel, preferredLanguage } = req.body;
  try {
    const conn = await pool.getConnection();
    await conn.query(
      "UPDATE User SET email=?, password=?, role=?, skillLevel=?, preferredLanguage=? WHERE userID=?",
      [email, password, role, skillLevel || null, preferredLanguage || null, id]
    );
    conn.release();
    res.json({ success: true, message: "User updated" });
  } catch (err) {
    console.error("PUT /api/users:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
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

app.get("/api/learning-paths", async (_req, res) => {
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

app.post("/api/learning-paths", async (req, res) => {
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

app.put("/api/learning-paths/:id", async (req, res) => {
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

app.delete("/api/learning-paths/:id", async (req, res) => {
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

app.get("/api/lessons", async (_req, res) => {
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

app.post("/api/lessons", async (req, res) => {
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

app.put("/api/lessons/:id", async (req, res) => {
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

app.delete("/api/lessons/:id", async (req, res) => {
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

app.get("/api/chat-sessions", async (_req, res) => {
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

app.get("/api/moderation/flags", async (_req, res) => {
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

app.put("/api/moderation/flags/:id", async (req, res) => {
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

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`CodePilot frontend running on http://localhost:${PORT}`);
  console.log(`[CodePilot] DB target: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
});
