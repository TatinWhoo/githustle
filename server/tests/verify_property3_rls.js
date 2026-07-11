import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TABLES = ['proposals', 'withdrawals', 'disputes', 'dispute_messages', 'time_entries', 'reviews'];

const EXPECTED_POLICIES = [
  'pol_proposals_access',
  'pol_withdrawals_access',
  'pol_disputes_access',
  'pol_dispute_messages_access',
  'pol_time_entries_access',
  'pol_reviews_access',
];

let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  PASS  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.log(`  FAIL  ${label}`);
  if (detail) console.log(`        ${detail}`);
  failed++;
}

async function main() {
  const client = await pool.connect();
  try {
    // ── Assertion A: RLS enabled on all 6 tables ───────────────────────────
    console.log('\nAssertion A — RLS enabled on all 6 tables');
    const { rows: rlsRows } = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE tablename = ANY($1::text[])
        AND schemaname = 'public'
      ORDER BY tablename
    `, [TABLES]);

    const foundTables = new Set(rlsRows.map(r => r.tablename));
    const missingTables = TABLES.filter(t => !foundTables.has(t));

    if (missingTables.length > 0) {
      fail('All 6 tables exist in public schema', `Missing: ${missingTables.join(', ')}`);
    } else {
      pass('All 6 tables exist in public schema');
    }

    for (const row of rlsRows) {
      if (row.rowsecurity === true) {
        pass(`${row.tablename}: rowsecurity = true`);
      } else {
        fail(`${row.tablename}: rowsecurity = true`, `Got rowsecurity = ${row.rowsecurity}`);
      }
    }

    // ── Assertion B: policies exist on all 6 tables ────────────────────────
    console.log('\nAssertion B — At least one policy per table');
    const { rows: policyRows } = await client.query(`
      SELECT tablename, policyname, qual
      FROM pg_policies
      WHERE tablename = ANY($1::text[])
        AND schemaname = 'public'
      ORDER BY tablename, policyname
    `, [TABLES]);

    const policyByTable = {};
    for (const row of policyRows) {
      if (!policyByTable[row.tablename]) policyByTable[row.tablename] = [];
      policyByTable[row.tablename].push(row);
    }

    for (const table of TABLES) {
      const policies = policyByTable[table] || [];
      if (policies.length >= 1) {
        pass(`${table}: has ${policies.length} policy/policies`);
      } else {
        fail(`${table}: has at least 1 policy`, 'No policies found');
      }
    }

    // ── Assertion C: expected policy names present ─────────────────────────
    console.log('\nAssertion C — Expected policy names present');
    const allPolicyNames = new Set(policyRows.map(r => r.policyname));

    for (const expected of EXPECTED_POLICIES) {
      if (allPolicyNames.has(expected)) {
        pass(`Policy exists: ${expected}`);
      } else {
        fail(`Policy exists: ${expected}`, `Not found. Found: ${[...allPolicyNames].join(', ')}`);
      }
    }

    // ── Assertion D: USING clauses reference current_setting ──────────────
    console.log('\nAssertion D — Policy USING clauses reference current_setting');

    // Build map: policyname → qual
    const qualByPolicy = {};
    for (const row of policyRows) {
      qualByPolicy[row.policyname] = row.qual;
    }

    for (const policyName of EXPECTED_POLICIES) {
      const qual = qualByPolicy[policyName];
      if (!qual) {
        fail(`${policyName}: USING clause contains current_setting`, 'Policy not found');
        continue;
      }
      if (qual.includes('current_setting')) {
        pass(`${policyName}: USING clause contains current_setting`);
      } else {
        fail(`${policyName}: USING clause contains current_setting`, `qual = ${qual}`);
      }
    }

  } finally {
    client.release();
    await pool.end();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('─────────────────────────────────────────────');

  if (failed > 0) {
    console.log('OVERALL: FAIL');
    process.exit(1);
  } else {
    console.log('OVERALL: PASS');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
