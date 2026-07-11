/**
 * verify_property2_triggers.js
 * Task 9.2 — Property 2: Trigger Logic Correctness (issues 1.5–1.7)
 *
 * Validates: Requirements 2.5, 2.6, 2.7
 *
 * Run from server/ directory:
 *   node tests/verify_property2_triggers.js
 *
 * Uses a dedicated pg.Client (not pool) for transactional tests.
 * All data-mutating assertions run inside a transaction that is ROLLED BACK.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from server/
const dotenv = require('dotenv');
dotenv.config({ path: resolve(__dirname, '../.env') });

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL not set in server/.env');
  process.exit(1);
}

// Helper to create a connected client with SSL + timeout
async function makeClient() {
  const c = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  });
  await c.connect();
  return c;
}

// ── helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  ✓ PASS  ${label}`);
  passed++;
}

function fail(label, detail = '') {
  console.log(`  ✗ FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

function assert(condition, label, detail = '') {
  if (condition) pass(label);
  else fail(label, detail);
}

// ── main ─────────────────────────────────────────────────────────────────────

async function run() {
  const client = await makeClient();

  // ── Schema-only assertions (no transaction needed) ─────────────────────────
  console.log('\n=== Schema assertions (read-only) ===');

  // Assertion A — freelancer_profiles.available_balance column absent
  {
    const { rows } = await client.query(`
      SELECT COUNT(*)::int AS cnt
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'freelancer_profiles'
        AND column_name  = 'available_balance'
    `);
    assert(rows[0].cnt === 0, 'A: freelancer_profiles.available_balance column absent',
      `found ${rows[0].cnt} column(s)`);
  }

  // Assertion B — v_freelancer_balance exposes available_balance
  {
    let ok = false;
    let detail = '';
    try {
      // Try querying the view directly — if column missing this will throw
      await client.query(`SELECT available_balance FROM v_freelancer_balance LIMIT 1`);
      ok = true;
    } catch (e) {
      detail = e.message;
    }
    assert(ok, 'B: v_freelancer_balance.available_balance column queryable', detail);
  }

  // Assertion C — client_profiles.jobs_completed column exists
  {
    const { rows } = await client.query(`
      SELECT COUNT(*)::int AS cnt
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'client_profiles'
        AND column_name  = 'jobs_completed'
    `);
    assert(rows[0].cnt === 1, 'C: client_profiles.jobs_completed column exists',
      `found ${rows[0].cnt} column(s)`);
  }

  // Assertion D — trg_jobs_posted trigger exists on job_postings
  {
    const { rows } = await client.query(`
      SELECT COUNT(*)::int AS cnt
      FROM information_schema.triggers
      WHERE trigger_schema     = 'public'
        AND trigger_name       = 'trg_jobs_posted'
        AND event_object_table = 'job_postings'
    `);
    assert(rows[0].cnt >= 1, 'D: trg_jobs_posted trigger exists on job_postings',
      `found ${rows[0].cnt} trigger(s)`);
  }

  // Assertion E — fn_recalc_average_rating body contains role check
  {
    const { rows } = await client.query(`
      SELECT prosrc FROM pg_proc WHERE proname = 'fn_recalc_average_rating'
    `);
    const body = rows[0]?.prosrc ?? '';
    const hasRoleCheck = body.includes('v_role') || body.includes('users.role');
    assert(hasRoleCheck, 'E: fn_recalc_average_rating body contains role check (v_role or users.role)',
      hasRoleCheck ? '' : 'body does not reference v_role or users.role');
  }

  // Assertion G — fn_sync_jobs_completed body references jobs_completed not jobs_posted for client
  {
    const { rows } = await client.query(`
      SELECT prosrc FROM pg_proc WHERE proname = 'fn_sync_jobs_completed'
    `);
    const body = rows[0]?.prosrc ?? '';
    const hasJobsCompleted = body.includes('jobs_completed');
    // The OLD (buggy) body would only reference jobs_posted for the client update
    // The FIXED body should reference jobs_completed for client_profiles
    const clientUpdateCorrect = body.includes('client_profiles') && body.includes('jobs_completed');
    assert(clientUpdateCorrect, 'G: fn_sync_jobs_completed increments jobs_completed on client_profiles',
      clientUpdateCorrect ? '' : `body does not update client_profiles.jobs_completed (body snippet: ${body.slice(0, 200)})`);
  }

  // ── Transactional assertions (data-mutating, rolled back) ──────────────────
  console.log('\n=== Transactional assertions (BEGIN … ROLLBACK) ===');

  await client.query('BEGIN');
  try {
    // Create test user (role='client')
    const userResult = await client.query(`
      INSERT INTO users (id, email, password_hash, role, username, is_verified)
      VALUES (
        gen_random_uuid(),
        'test_property2_' || floor(random()*1000000)::text || '@test.invalid',
        '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'client',
        'test_prop2_' || floor(random()*1000000)::text,
        TRUE
      )
      RETURNING id
    `);
    const clientUserId = userResult.rows[0].id;

    // Create client_profile for that user
    await client.query(`
      INSERT INTO client_profiles (user_id, display_name)
      VALUES ($1, 'Test Client Property2')
    `, [clientUserId]);

    // Record jobs_posted BEFORE insert
    const beforeInsert = await client.query(`
      SELECT jobs_posted, jobs_completed FROM client_profiles WHERE user_id = $1
    `, [clientUserId]);
    const jobsPostedBefore = beforeInsert.rows[0].jobs_posted;
    const jobsCompletedBefore = beforeInsert.rows[0].jobs_completed;

    // Assertion F — INSERT job_posting increments jobs_posted by 1
    await client.query(`
      INSERT INTO job_postings (
        id, client_id, title, description, category, budget_type,
        budget_min, budget_max, status
      )
      VALUES (
        gen_random_uuid(), $1,
        'Test Job Property2',
        'Test description for property 2 verification',
        'development',
        'fixed',
        100, 500,
        'open'
      )
    `, [clientUserId]);

    const afterInsert = await client.query(`
      SELECT jobs_posted, jobs_completed FROM client_profiles WHERE user_id = $1
    `, [clientUserId]);
    const jobsPostedAfter = afterInsert.rows[0].jobs_posted;
    const jobsCompletedAfter = afterInsert.rows[0].jobs_completed;

    assert(
      jobsPostedAfter === jobsPostedBefore + 1,
      'F: INSERT job_posting increments client_profiles.jobs_posted by 1',
      `before=${jobsPostedBefore}, after=${jobsPostedAfter}`
    );
    assert(
      jobsCompletedAfter === jobsCompletedBefore,
      'F-side: INSERT job_posting does NOT change jobs_completed',
      `before=${jobsCompletedBefore}, after=${jobsCompletedAfter}`
    );

    // ── Assertion for complete-project → jobs_completed increments ─────────────
    // Need a freelancer user + profile + project
    const freelancerUserResult = await client.query(`
      INSERT INTO users (id, email, password_hash, role, username, is_verified)
      VALUES (
        gen_random_uuid(),
        'test_property2_fl_' || floor(random()*1000000)::text || '@test.invalid',
        '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'freelancer',
        'test_prop2_fl_' || floor(random()*1000000)::text,
        TRUE
      )
      RETURNING id
    `);
    const freelancerUserId = freelancerUserResult.rows[0].id;

    await client.query(`
      INSERT INTO freelancer_profiles (user_id, display_name)
      VALUES ($1, 'Test Freelancer Property2')
    `, [freelancerUserId]);

    // Insert a project (in_progress → we'll update to completed)
    const projectResult = await client.query(`
      INSERT INTO projects (
        id, client_id, freelancer_id, title, description, status, budget
      )
      VALUES (
        gen_random_uuid(), $1, $2,
        'Test Project Property2',
        'Test project for trigger verification',
        'in_progress',
        500
      )
      RETURNING id
    `, [clientUserId, freelancerUserId]);
    const projectId = projectResult.rows[0].id;

    // Record counters before completion
    const beforeComplete = await client.query(`
      SELECT jobs_posted, jobs_completed FROM client_profiles WHERE user_id = $1
    `, [clientUserId]);
    const jobsPostedBeforeComplete = beforeComplete.rows[0].jobs_posted;
    const jobsCompletedBeforeComplete = beforeComplete.rows[0].jobs_completed;

    // Update project to completed → should fire trg_jobs_completed
    await client.query(`
      UPDATE projects SET status = 'completed' WHERE id = $1
    `, [projectId]);

    const afterComplete = await client.query(`
      SELECT jobs_posted, jobs_completed FROM client_profiles WHERE user_id = $1
    `, [clientUserId]);
    const jobsPostedAfterComplete = afterComplete.rows[0].jobs_posted;
    const jobsCompletedAfterComplete = afterComplete.rows[0].jobs_completed;

    assert(
      jobsCompletedAfterComplete === jobsCompletedBeforeComplete + 1,
      'F2: Complete project increments client_profiles.jobs_completed by 1',
      `before=${jobsCompletedBeforeComplete}, after=${jobsCompletedAfterComplete}`
    );
    assert(
      jobsPostedAfterComplete === jobsPostedBeforeComplete,
      'F2-side: Complete project does NOT change jobs_posted',
      `before=${jobsPostedBeforeComplete}, after=${jobsPostedAfterComplete}`
    );

    // ── Assertion for insert review → client_profiles xmin unchanged ──────────
    // Insert review where reviewee = freelancer → client_profiles should NOT be touched
    const clientXminBefore = await client.query(`
      SELECT xmin FROM client_profiles WHERE user_id = $1
    `, [clientUserId]);
    const xminBefore = clientXminBefore.rows[0].xmin;

    await client.query(`
      INSERT INTO reviews (
        id, reviewer_id, reviewee_id, rating, comment, is_public
      )
      VALUES (
        gen_random_uuid(), $1, $2,
        5, 'Great freelancer!', TRUE
      )
    `, [clientUserId, freelancerUserId]);

    const clientXminAfter = await client.query(`
      SELECT xmin FROM client_profiles WHERE user_id = $1
    `, [clientUserId]);
    const xminAfter = clientXminAfter.rows[0].xmin;

    assert(
      xminBefore === xminAfter,
      'F3: Insert review for freelancer does NOT update client_profiles (xmin unchanged)',
      `xmin before=${xminBefore}, after=${xminAfter}`
    );

  } catch (e) {
    fail('TRANSACTION ERROR', e.message);
    console.error(e);
  } finally {
    await client.query('ROLLBACK');
  }

  // ── v_freelancer_balance arithmetic check (read-only) ─────────────────────
  console.log('\n=== View arithmetic assertion ===');
  {
    // Query view definition to confirm it joins payments + withdrawals
    const { rows } = await client.query(`SELECT pg_get_viewdef('v_freelancer_balance'::regclass, TRUE) AS def`);
    const def = rows[0]?.def ?? '';
    const joinPayments = def.toLowerCase().includes('payments');
    const joinWithdrawals = def.toLowerCase().includes('withdrawals');
    assert(
      joinPayments && joinWithdrawals,
      'B2: v_freelancer_balance definition joins payments AND withdrawals (derived, not mutable column)',
      joinPayments && joinWithdrawals ? '' : `payments=${joinPayments}, withdrawals=${joinWithdrawals}`
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  await client.end();

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'─'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
