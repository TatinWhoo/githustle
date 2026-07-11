/**
 * Property 1 Fix-Verification Test — Critical Structural / Data Safety
 * Task 9.1 — schema-health-fixes spec
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 *
 * Asserts (on live Supabase DB after 011_a_critical_structural.sql applied):
 *   1.1 — 000_general_migration.sql has no duplicate CREATE TABLE blocks
 *   1.2 — users.email_verify_token and users.password_reset_token comments contain 'SHA-256'
 *   1.3a — mfa_recovery_codes table exists
 *   1.3b — mfa_recovery_codes has columns: id, user_id, code_hash, used_at, created_at
 *   1.3c — users.mfa_recovery_codes array column absent
 *   1.4  — withdrawals.account_details data_type is 'text'
 *
 * Exit 0 = all pass. Exit 1 = one or more failures.
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load .env from server directory
const envPath = path.resolve(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL not found in server/.env');
  process.exit(1);
}

const { Pool } = pg;

// Supabase pooler (port 6543): use uselibpqcompat for correct SSL negotiation
const baseUrl = DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]uselibpqcompat=[^&]*/g, '');
const sep = baseUrl.includes('?') ? '&' : '?';
const connStr = `${baseUrl}${sep}sslmode=require&uselibpqcompat=true`;

const pool = new Pool({
  connectionString: connStr,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 5000,
});

let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  PASS  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.log(`  FAIL  ${label}`);
  if (detail !== undefined) console.log(`        → ${detail}`);
  failed++;
}

// ---------------------------------------------------------------------------
// Assertion 1.1 — no duplicate CREATE TABLE in 000_general_migration.sql
// ---------------------------------------------------------------------------
async function assert_1_1_no_duplicate_tables() {
  const migPath = path.resolve(__dirname, '..', 'sql', 'migrations', '000_general_migration.sql');
  const sql = readFileSync(migPath, 'utf8');

  const tables = ['notification_preferences', 'disputes', 'dispute_messages'];
  let allOk = true;

  for (const tbl of tables) {
    // count occurrences of "CREATE TABLE <name>" (case-insensitive, ignores IF NOT EXISTS variants)
    const regex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${tbl}\\b`, 'gi');
    const matches = sql.match(regex) || [];
    if (matches.length === 1) {
      pass(`1.1  CREATE TABLE ${tbl} appears exactly once in 000_general_migration.sql`);
    } else {
      fail(`1.1  CREATE TABLE ${tbl} appears exactly once in 000_general_migration.sql`,
           `found ${matches.length} occurrences`);
      allOk = false;
    }
  }
}

// ---------------------------------------------------------------------------
// Assertion 1.2 — column comments contain 'SHA-256'
// ---------------------------------------------------------------------------
async function assert_1_2_token_column_comments(client) {
  const res = await client.query(`
    SELECT a.attname AS column_name,
           col_description(c.oid, a.attnum) AS comment
    FROM   pg_class c
    JOIN   pg_attribute a ON a.attrelid = c.oid
    WHERE  c.relname = 'users'
    AND    a.attname IN ('email_verify_token', 'password_reset_token')
    AND    a.attnum > 0
  `);

  const rows = res.rows;
  for (const col of ['email_verify_token', 'password_reset_token']) {
    const row = rows.find(r => r.column_name === col);
    if (!row) {
      fail(`1.2  users.${col} column exists`, 'column not found');
      continue;
    }
    const comment = row.comment || '';
    if (comment.includes('SHA-256')) {
      pass(`1.2  users.${col} comment contains 'SHA-256'`);
    } else {
      fail(`1.2  users.${col} comment contains 'SHA-256'`,
           `actual comment: "${comment}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Assertion 1.3a — mfa_recovery_codes table exists
// ---------------------------------------------------------------------------
async function assert_1_3a_table_exists(client) {
  const res = await client.query(`
    SELECT COUNT(*)::int AS cnt
    FROM   information_schema.tables
    WHERE  table_schema = 'public'
    AND    table_name   = 'mfa_recovery_codes'
  `);
  if (res.rows[0].cnt === 1) {
    pass('1.3a mfa_recovery_codes table exists');
  } else {
    fail('1.3a mfa_recovery_codes table exists', 'table not found');
  }
}

// ---------------------------------------------------------------------------
// Assertion 1.3b — mfa_recovery_codes has required columns
// ---------------------------------------------------------------------------
async function assert_1_3b_table_columns(client) {
  const res = await client.query(`
    SELECT column_name
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
    AND    table_name   = 'mfa_recovery_codes'
    ORDER BY ordinal_position
  `);
  const cols = res.rows.map(r => r.column_name);
  const required = ['id', 'user_id', 'code_hash', 'used_at', 'created_at'];

  for (const col of required) {
    if (cols.includes(col)) {
      pass(`1.3b mfa_recovery_codes.${col} column exists`);
    } else {
      fail(`1.3b mfa_recovery_codes.${col} column exists`,
           `actual columns: [${cols.join(', ')}]`);
    }
  }
}

// ---------------------------------------------------------------------------
// Assertion 1.3c — users.mfa_recovery_codes array column absent
// ---------------------------------------------------------------------------
async function assert_1_3c_array_column_absent(client) {
  const res = await client.query(`
    SELECT COUNT(*)::int AS cnt
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
    AND    table_name   = 'users'
    AND    column_name  = 'mfa_recovery_codes'
  `);
  if (res.rows[0].cnt === 0) {
    pass('1.3c users.mfa_recovery_codes array column is absent');
  } else {
    fail('1.3c users.mfa_recovery_codes array column is absent',
         'column still present on users table');
  }
}

// ---------------------------------------------------------------------------
// Assertion 1.4 — withdrawals.account_details data_type is 'text'
// ---------------------------------------------------------------------------
async function assert_1_4_account_details_type(client) {
  const res = await client.query(`
    SELECT data_type
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
    AND    table_name   = 'withdrawals'
    AND    column_name  = 'account_details'
  `);
  if (res.rows.length === 0) {
    fail('1.4  withdrawals.account_details data_type is text', 'column not found');
    return;
  }
  const dtype = res.rows[0].data_type;
  if (dtype === 'text') {
    pass('1.4  withdrawals.account_details data_type is text');
  } else {
    fail('1.4  withdrawals.account_details data_type is text',
         `actual data_type: "${dtype}"`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\nProperty 1 Fix-Verification — Critical Structural / Data Safety\n');

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('FATAL: could not connect to database:', err.message);
    process.exit(1);
  }

  try {
    await assert_1_1_no_duplicate_tables();
    await assert_1_2_token_column_comments(client);
    await assert_1_3a_table_exists(client);
    await assert_1_3b_table_columns(client);
    await assert_1_3c_array_column_absent(client);
    await assert_1_4_account_details_type(client);
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${'─'.repeat(60)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
