import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { Pool } = pg;
const url = process.env.DATABASE_URL;
console.log('URL prefix:', url?.slice(0, 60));

// Try port 5432 (direct) instead of 6543 (pooler)
const directUrl = url?.replace(':6543/', ':5432/');
console.log('Direct URL prefix:', directUrl?.slice(0, 60));

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 12000,
});

try {
  const c = await pool.connect();
  const r = await c.query('SELECT current_database() AS db');
  console.log('Connected to:', r.rows[0].db);
  c.release();
} catch(e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
