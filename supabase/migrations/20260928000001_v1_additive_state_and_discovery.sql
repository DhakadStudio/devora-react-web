-- ============================================================================
-- V1 — Additive migration: progress state extension, discovery fields,
--      hint usage, project guide level, guided project seed
-- ============================================================================
-- Devora V1 (Tier 1 core loop). This migration is ADDITIVE ONLY — no
-- existing column is dropped or rewritten, and no existing RLS policy is
-- touched. New columns inherit their table's existing RLS.
--
-- Design decisions (documented, not silently assumed):
--
-- 1. lesson_progress.status is extended to the V1 state set locked in the
--    V1 spec (§A4): not-started / started / attempted / passed / completed.
--    The previous CHECK allowed not-started / in-progress / completed.
--    'in-progress' is RETIRED here by explicit ruling: the table has zero
--    rows, the V1 spec defines the authoritative state set, and keeping a
--    second value with the same meaning ('in-progress' ≈ 'started') would
--    force every consumer to special-case it forever. Future states
--    (revisited / mastered / struggling) are added later as one-ALTER enum
--    extensions — never as a boolean or a column rewrite.
--
-- 2. exercise_attempts gains hints_used (integer, default 0) — progressive
--    hint usage tracked per attempt. Additive with a default, so no
--    existing row or constraint is affected.
--
-- 3. learning_paths gains discovery fields (level, hours, prerequisites,
--    outcomes) so the homepage/paths pages can show difficulty, time,
--    prerequisites and outcomes from the database. All additive with
--    defaults; outcomes is JSONB so future outcome metadata needs no
--    migration.
--
-- 4. projects gains guide_level — the project's guidance level
--    (guided / partially-guided / independent / portfolio) as DATA, not
--    new code paths. Default 'guided' matches the V1 scope ("guided level
--    only"); the other levels activate later as rows, not features.
--
-- 5. Seed: updates the existing javascript-fundamentals path's discovery
--    fields, and inserts ONE guided project for the foundations module so
--    the project engine + project_submissions flow has a real row in V1.
--    Data-only (on conflict do nothing) — re-running is safe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. lesson_progress — extend status to the V1 state set
-- ----------------------------------------------------------------------------
alter table lesson_progress drop constraint if exists lesson_progress_status_check;
alter table lesson_progress drop constraint if exists lesson_progress_state_shape;

alter table lesson_progress add constraint lesson_progress_status_check
  check (status in ('not-started', 'started', 'attempted', 'passed', 'completed'));

-- Mirrors the V1 state machine invariants:
--   not-started                -> started_at and completed_at both null
--   started / attempted / passed -> started_at required, completed_at null
--   completed                  -> both required, started_at <= completed_at
alter table lesson_progress add constraint lesson_progress_state_shape check (
  (status = 'not-started' and started_at is null and completed_at is null)
  or (status in ('started', 'attempted', 'passed')
      and started_at is not null and completed_at is null)
  or (status = 'completed'
      and started_at is not null and completed_at is not null
      and started_at <= completed_at)
);

comment on column lesson_progress.status is
  'V1 state set: not-started / started / attempted / passed / completed. in-progress retired (explicit ruling — table was empty). Future states (revisited/mastered/struggling) extend this CHECK as one-ALTER additions.';

-- ----------------------------------------------------------------------------
-- 2. exercise_attempts — hint usage per attempt
-- ----------------------------------------------------------------------------
alter table exercise_attempts add column if not exists hints_used integer not null default 0;

comment on column exercise_attempts.hints_used is
  'V1 — number of progressive hints revealed during this attempt. Additive (default 0); tracked per attempt, never aggregated into the attempt history.';

-- ----------------------------------------------------------------------------
-- 3. learning_paths — discovery fields (difficulty/time/prereqs/outcomes)
-- ----------------------------------------------------------------------------
alter table learning_paths add column if not exists level text;
alter table learning_paths add column if not exists hours numeric;
alter table learning_paths add column if not exists prerequisites text;
alter table learning_paths add column if not exists outcomes jsonb not null default '[]'::jsonb;

comment on column learning_paths.level is
  'V1 — display difficulty for curriculum discovery (e.g. Beginner). Free-form text; presentation concern, not a constraint.';
comment on column learning_paths.hours is
  'V1 — approximate hours to complete, shown on discovery pages.';
comment on column learning_paths.prerequisites is
  'V1 — human-readable prerequisites line for the path detail page.';
comment on column learning_paths.outcomes is
  'V1 — JSONB array of outcome strings shown on discovery pages. JSONB so future outcome metadata is additive, no migration.';

-- ----------------------------------------------------------------------------
-- 4. projects — guidance level as data
-- ----------------------------------------------------------------------------
alter table projects add column if not exists guide_level text not null default 'guided'
  check (guide_level in ('guided', 'partially-guided', 'independent', 'portfolio'));

comment on column projects.guide_level is
  'V1 — guidance level as data (guided default per V1 scope). partially-guided/independent/portfolio activate later as rows, not new code paths.';

-- ----------------------------------------------------------------------------
-- 5. Seed — path discovery fields + one guided project (data-only)
-- ----------------------------------------------------------------------------
update learning_paths set
  level         = 'Beginner',
  hours         = 4,
  prerequisites = 'No experience needed — this is the on-ramp.',
  outcomes      = '["Print values and read what your program did", "Store and reuse data in variables", "Make decisions with conditionals", "Repeat work with loops and lists", "Fix broken code by reading its errors"]'::jsonb
where id = 'javascript-fundamentals';

insert into projects (id, module_id, title, brief, rubric, guide_level) values
  ('javascript-fundamentals/core/foundations/intro-card',
   'javascript-fundamentals/core/foundations',
   'Build your intro card',
   'Combine variables, output and your own text into one small real program you can show someone: a card that introduces you. Use everything from the Foundations module.',
   '[{"kind":"requirement","label":"Card prints a heading with your name in it","hint":"Store your name in a variable first, then print the heading with console.log."},{"kind":"requirement","label":"Card prints at least one more line about you","hint":"Use a second console.log with your own text."},{"kind":"requirement","label":"The program runs without errors","hint":"If something fails, read the error left to right — it names the first thing JavaScript could not understand."}]'::jsonb,
   'guided')
on conflict (id) do nothing;
