// server.ts
import express, { Express, Request, Response } from 'express';
import { createPool, Pool } from 'mysql2/promise';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import nodemailer, { Transporter } from 'nodemailer';
import helmet from 'helmet';
import morgan from 'morgan';
import asyncRetry from 'async-retry';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env');
dotenv.config({ path: envPath });

const requiredEnvVars = [
  'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS',
  'CLIENT_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET',
  'JWT_EXPIRES_IN', 'REFRESH_TOKEN_EXPIRES_IN', 'PORT',
  'NODE_ENV', 'REACT_APP_API_URL'
];

const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`\u274C Missing env vars: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

if (process.env.GOOGLE_CLIENT_ID === 'your-google-client-id') {
  console.warn('⚠️ GOOGLE_CLIENT_ID is set to a placeholder.');
}

const app = express();

// Middleware setup
app.use(cors({
  origin: [process.env.CLIENT_URL, 'http://localhost:5173'],
  credentials: true,
}));
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(join(__dirname, 'Uploads')));

// MySQL connection pool
const pool = createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log('✅ SMTP ready.');
  } catch (err) {
    console.error('❌ SMTP error:', err.message);
    process.exit(1);
  }
}
verifyTransporter();

async function initDb() {
  try {
    await asyncRetry(async () => {
      const conn = await pool.getConnection();
      try {
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
        await conn.query(`USE \`${process.env.DB_NAME}\`;`);
        await conn.query(`CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          firstName VARCHAR(50),
          lastName VARCHAR(50),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          isVerified BOOLEAN DEFAULT FALSE,
          verificationToken VARCHAR(64),
          role ENUM('user', 'admin') DEFAULT 'user',
          isBlocked BOOLEAN DEFAULT FALSE,
          isApproved BOOLEAN DEFAULT FALSE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          lastLogin TIMESTAMP
        );`);
        await conn.query(`CREATE TABLE IF NOT EXISTS contacts (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(100),
          email VARCHAR(255),
          message TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        await conn.query(`CREATE TABLE IF NOT EXISTS otps (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255),
          otp VARCHAR(6),
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expiresAt TIMESTAMP
        );`);
        await conn.query(`CREATE TABLE IF NOT EXISTS refresh_tokens (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          user_id VARCHAR(36),
          token VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );`);
        await conn.query(`CREATE TABLE IF NOT EXISTS emails (
          id VARCHAR(36) PRIMARY KEY,
          sender_id VARCHAR(36),
          recipient_id VARCHAR(36),
          recipient_email VARCHAR(255),
          subject VARCHAR(255),
          body TEXT,
          folder ENUM('inbox', 'sent', 'trash', 'draft') DEFAULT 'inbox',
          is_read BOOLEAN DEFAULT FALSE,
          is_starred BOOLEAN DEFAULT FALSE,
          labels JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
        );`);
        console.log('✅ DB initialized.');
      } finally {
        conn.release();
      }
    }, {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 5000,
      onRetry: (err, attempt) => {
        console.warn(`⚠️ DB init attempt ${attempt} failed:`, err && err.message ? err.message : err);
      }
    });
  } catch (err) {
    console.error('❌ DB init failed:', err.message);
    process.exit(1);
  }
}
initDb();

app.locals.pool = pool;
app.locals.transporter = transporter;

app.get('/health', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('❌ DB health check failed:', err.message);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);

const PORT = parseInt(process.env.PORT || '5000', 10);
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
