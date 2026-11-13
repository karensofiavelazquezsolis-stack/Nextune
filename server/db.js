import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nexttune',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // las fechas llegan como 'YYYY-MM-DD'
});

export const q = async (sql, params = []) => (await pool.query(sql, params))[0];
