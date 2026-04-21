const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
require("dotenv").config();

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "";
const DB_NAME = process.env.DB_NAME || "codepilot";
const DB_PORT = Number(process.env.DB_PORT || 3306);

async function hashExistingPasswords() {
  const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    port: DB_PORT,
  });

  try {
    const conn = await pool.getConnection();

    // Get all users
    const [users] = await conn.query("SELECT userID, email, password FROM User");
    console.log(`Found ${users.length} users to process.\n`);

    let hashedCount = 0;
    let alreadyHashedCount = 0;

    for (const user of users) {
      const { userID, email, password } = user;

      // Check if password is already hashed (bcrypt format starts with $2a$, $2b$, or $2y$)
      const isBcryptHash = /^\$2[aby]\$/.test(password);

      if (isBcryptHash) {
        console.log(`✓ User ${email} (ID: ${userID}) - Already hashed`);
        alreadyHashedCount++;
      } else {
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          await conn.query("UPDATE User SET password=? WHERE userID=?", [
            hashedPassword,
            userID,
          ]);
          console.log(`✓ User ${email} (ID: ${userID}) - Password hashed`);
          hashedCount++;
        } catch (err) {
          console.error(
            `✗ User ${email} (ID: ${userID}) - Error: ${err.message}`
          );
        }
      }
    }

    conn.release();
    pool.end();

    console.log(`\n=== Migration Summary ===`);
    console.log(`Passwords hashed: ${hashedCount}`);
    console.log(`Already hashed: ${alreadyHashedCount}`);
    console.log(`Total processed: ${hashedCount + alreadyHashedCount}`);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

hashExistingPasswords();
