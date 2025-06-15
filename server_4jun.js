// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mysql from 'mysql2/promise';
import authRoutes from './routes/authRoutes.js';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// ✅ Middleware Setup
// --------------------
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data

// Optional: Serve static files from Uploads directory (if needed)
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// --------------------
// ✅ Database Pool (MySQL)
// --------------------
export const dbPool = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'email',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// --------------------
// ✅ Nodemailer Transport (for testing if needed)
// --------------------
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use SMTP config
  auth: {
    user: process.env.EMAIL_USER, // must be defined in .env
    pass: process.env.EMAIL_PASS  // must be defined in .env
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Nodemailer failed to connect:', error);
  } else {
    console.log('✅ Nodemailer is ready to send emails');
  }
});

// --------------------
// ✅ Routes
// --------------------
app.use('/api', authRoutes);

// --------------------
// ✅ Root Route
// --------------------
app.get('/', (req, res) => {
  res.send('🚀 Server is running...');
});

// --------------------
// ✅ Start Server
// --------------------
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
