/**
 * Property 5 Verification — Indexes and ENUM Migrations
 * Validates fixes for issues 1.20 (idx_rt_token_hash),
 * 1.21 (idx_rev_reviewer), 1.22 (payment_tx_type, platform_fee_type ENUMs)
 *
 * Validates: Requirements 1.20, 1.21, 1.22
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

let passed = 0;
let failed = 0;

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function run() {
  await client.connect();
  console.log('\nProperty 5 — Indexes and ENUM Migrations\n');

  // Assertion A — idx_rt_token_hash exists
  {
    const res = await client.query(`
      SELECT COUNT(*) FROM pg_indexes
      WHERE tablename = 'refresh_tokens'
        AND indexname = 'idx_rt_token_hash'
        AND schemaname = 'public'
    `);
    assert('A — idx_rt_token_hash exists', parseInt(res.rows[0].count) === 1,
      `count=${res.rows[0].count}`);
  }

  // Assertion B — idx_rev_reviewer exists
  {
    const res = await client.query(`
      SELECT COUNT(*) FROM pg_indexes
      WHERE tablename = 'reviews'
        AND indexname = 'idx_rev_reviewer'
        AND schemaname = 'public'
    `);
    assert('B — idx_rev_reviewer exists', parseInt(res.rows[0].count) === 1,
      `count=${res.rows[0].count}`);
  }

  // Assertion C — EXPLAIN shows Index Scan for refresh_tokens.token_hash
  {
    const res = await client.query(`EXPLAIN SELECT * FROM refresh_tokens WHERE token_hash = 'testvalue'`);
    const plan = res.rows.map(r => Object.values(r)[0]).join('\n');
    const isIndexScan = plan.includes('Index Scan');
    assert('C — refresh_tokens token_hash uses Index Scan', isIndexScan,
      isIndexScan ? '' : `plan:\n${plan}`);
  }

  // Assertion D — EXPLAIN shows Index Scan for reviews.reviewer_id
  {
    const res = await client.query(`EXPLAIN SELECT * FROM reviews WHERE reviewer_id = '00000000-0000-0000-0000-000000000000'`);
    const plan = res.rows.map(r => Object.values(r)[0]).join('\n');
    const isIndexScan = plan.includes('Index Scan');
    assert('D — reviews reviewer_id uses Index Scan', isIndexScan,
      isIndexScan ? '' : `plan:\n${plan}`);
  }

  // Assertion E — payments.payment_type is USER-DEFINED (ENUM)
  {
    const res = await client.query(`
      SELECT data_type, udt_name FROM information_schema.columns
      WHERE table_name = 'payments'
        AND column_name = 'payment_type'
        AND table_schema = 'public'
    `);
    const row = res.rows[0];
    assert('E — payments.payment_type is USER-DEFINED',
      row && row.data_type === 'USER-DEFINED' && row.udt_name === 'payment_tx_type',
      row ? `data_type=${row.data_type}, udt_name=${row.udt_name}` : 'row not found');
  }

  // Assertion F — platform_fees.fee_type is USER-DEFINED (ENUM)
  {
    const res = await client.query(`
      SELECT data_type, udt_name FROM information_schema.columns
      WHERE table_name = 'platform_fees'
        AND column_name = 'fee_type'
        AND table_schema = 'public'
    `);
    const row = res.rows[0];
    assert('F — platform_fees.fee_type is USER-DEFINED',
      row && row.data_type === 'USER-DEFINED' && row.udt_name === 'platform_fee_type',
      row ? `data_type=${row.data_type}, udt_name=${row.udt_name}` : 'row not found');
  }

  // Assertion G — ENUM types exist
  {
    const res = await client.query(`
      SELECT typname FROM pg_type
      WHERE typname IN ('payment_tx_type', 'platform_fee_type')
        AND typtype = 'e'
    `);
    assert('G — both ENUM types exist', res.rows.length === 2,
      `found ${res.rows.length}: ${res.rows.map(r => r.typname).join(', ')}`);
  }

  // Assertion H — payment_tx_type ENUM values correct
  {
    const res = await client.query(`
      SELECT enumlabel FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'payment_tx_type'
      ORDER BY enumsortorder
    `);
    const labels = res.rows.map(r => r.enumlabel);
    const expected = ['charge', 'refund', 'adjustment'];
    const match = labels.length === expected.length &&
      expected.every((v, i) => labels[i] === v);
    assert('H — payment_tx_type ENUM values correct', match,
      `got: [${labels.join(', ')}], expected: [${expected.join(', ')}]`);
  }

  // Assertion I — existing refresh_tokens indexes preserved
  {
    const res = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'refresh_tokens'
        AND schemaname = 'public'
      ORDER BY indexname
    `);
    const names = res.rows.map(r => r.indexname);
    const hasTokenHash = names.includes('idx_rt_token_hash');
    const hasUserId = names.includes('idx_rt_user_id');
    const hasFamily = names.includes('idx_rt_family');
    console.log(`    indexes found: [${names.join(', ')}]`);
    assert('I — idx_rt_user_id preserved', hasUserId, `indexes: [${names.join(', ')}]`);
    assert('I — idx_rt_family preserved', hasFamily, `indexes: [${names.join(', ')}]`);
    assert('I — idx_rt_token_hash present alongside pre-existing', hasTokenHash && (hasUserId || hasFamily));
  }

  await client.end();

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('STATUS: FAIL');
    process.exit(1);
  } else {
    console.log('STATUS: PASS');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
