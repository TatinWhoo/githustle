// verify_property4_missing_tables.js
// Property 4: Expected Behavior — Missing Tables Now Present
// Validates: Issues 1.13–1.19, 1.23
// Read-only catalog assertions — no DML

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TABLES = [
  'profile_views',
  'teams',
  'team_members',
  'contract_templates',
  'content_reports',
  'user_verifications',
  'ai_proposal_usage',
  'saved_freelancers',
  'collab_board_versions',
];

const REQUIRED_COLUMNS = {
  profile_views:        ['id', 'profile_id', 'viewer_id', 'viewed_at'],
  teams:                ['id', 'owner_id', 'name', 'created_at', 'updated_at'],
  team_members:         ['team_id', 'user_id', 'role', 'joined_at'],
  contract_templates:   ['id', 'owner_id', 'name', 'body', 'is_nda', 'is_active', 'created_at', 'updated_at'],
  content_reports:      ['id', 'reporter_id', 'entity_type', 'entity_id', 'reason', 'description', 'status', 'reviewed_by', 'reviewed_at', 'created_at'],
  user_verifications:   ['id', 'user_id', 'verification_type', 'status', 'verified_at', 'created_at'],
  ai_proposal_usage:    ['id', 'user_id', 'period_month', 'count', 'created_at', 'updated_at'],
  saved_freelancers:    ['client_id', 'freelancer_profile_id', 'created_at'],
  collab_board_versions:['id', 'board_id', 'version', 'elements_state', 'saved_by_id', 'created_at'],
};

const EXPECTED_INDEXES = [
  'idx_pv_profile_id',
  'idx_teams_owner_id',
  'idx_tm_user_id',
  'idx_ct_owner_id',
  'idx_cr_entity',
  'idx_uv_user_id',
  'idx_apu_user_month',
  'idx_sf_client_id',
  'idx_cbv_board_id',
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

async function assertA(client) {
  console.log('\nAssertion A — all 9 tables exist');
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (${TABLES.map((_, i) => `$${i + 1}`).join(',')})
    ORDER BY table_name
  `, TABLES);

  const found = rows.map(r => r.table_name);
  if (found.length === 9) {
    pass(`all 9 tables present: ${found.join(', ')}`);
  } else {
    const missing = TABLES.filter(t => !found.includes(t));
    fail(`expected 9 tables, found ${found.length}`, `missing: ${missing.join(', ')}`);
  }
}

async function assertB(client) {
  console.log('\nAssertion B — correct columns per table');
  for (const [table, requiredCols] of Object.entries(REQUIRED_COLUMNS)) {
    const { rows } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `, [table]);
    const actual = rows.map(r => r.column_name);
    const missing = requiredCols.filter(c => !actual.includes(c));
    if (missing.length === 0) {
      pass(`${table} — columns OK`);
    } else {
      fail(`${table} — missing columns`, `missing: ${missing.join(', ')}`);
    }
  }
}

async function assertC(client) {
  console.log('\nAssertion C — FK constraints exist');
  const { rows } = await client.query(`
    SELECT DISTINCT tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND kcu.table_schema = 'public'
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = 'public'
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = ANY($1::text[])
  `, [TABLES]);

  const tablesWithFK = rows.map(r => r.table_name);
  for (const table of TABLES) {
    if (tablesWithFK.includes(table)) {
      pass(`${table} — FK constraint present`);
    } else {
      fail(`${table} — no FK constraint found`);
    }
  }
}

async function assertD(client) {
  console.log('\nAssertion D — unique constraints');

  // ai_proposal_usage: UNIQUE(user_id, period_month)
  const { rows: uniqueRows } = await client.query(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND kcu.table_schema = 'public'
    WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('ai_proposal_usage', 'collab_board_versions')
    ORDER BY tc.table_name, kcu.ordinal_position
  `);

  const byTable = {};
  for (const r of uniqueRows) {
    if (!byTable[r.table_name]) byTable[r.table_name] = [];
    byTable[r.table_name].push(r.column_name);
  }

  // ai_proposal_usage UNIQUE(user_id, period_month)
  const apuCols = byTable['ai_proposal_usage'] || [];
  if (apuCols.includes('user_id') && apuCols.includes('period_month')) {
    pass('ai_proposal_usage — UNIQUE(user_id, period_month) present');
  } else {
    fail('ai_proposal_usage — UNIQUE(user_id, period_month) missing', `found cols: ${apuCols.join(', ')}`);
  }

  // collab_board_versions UNIQUE(board_id, version)
  const cbvCols = byTable['collab_board_versions'] || [];
  if (cbvCols.includes('board_id') && cbvCols.includes('version')) {
    pass('collab_board_versions — UNIQUE(board_id, version) present');
  } else {
    fail('collab_board_versions — UNIQUE(board_id, version) missing', `found cols: ${cbvCols.join(', ')}`);
  }

  // saved_freelancers: composite PK (client_id, freelancer_profile_id) serves as unique
  const { rows: pkRows } = await client.query(`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND kcu.table_schema = 'public'
    WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'saved_freelancers'
    ORDER BY kcu.ordinal_position
  `);
  const pkCols = pkRows.map(r => r.column_name);
  if (pkCols.includes('client_id') && pkCols.includes('freelancer_profile_id')) {
    pass('saved_freelancers — composite PK (client_id, freelancer_profile_id) present');
  } else {
    fail('saved_freelancers — composite PK missing', `found: ${pkCols.join(', ')}`);
  }
}

async function assertE(client) {
  console.log('\nAssertion E — expected indexes exist');
  const { rows } = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = ANY($1::text[])
    AND schemaname = 'public'
  `, [TABLES]);

  const found = rows.map(r => r.indexname);
  for (const idx of EXPECTED_INDEXES) {
    if (found.includes(idx)) {
      pass(`index ${idx} present`);
    } else {
      fail(`index ${idx} missing`);
    }
  }
}

async function main() {
  const client = await pool.connect();
  try {
    await assertA(client);
    await assertB(client);
    await assertC(client);
    await assertD(client);
    await assertE(client);
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('OVERALL: PASS — Property 4 verified. All missing tables present and correctly structured.');
    process.exit(0);
  } else {
    console.log('OVERALL: FAIL — One or more assertions failed.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
