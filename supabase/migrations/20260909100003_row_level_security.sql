-- ============================================================================
-- WP 0.5 — Migration 3 of 4: Row Level Security
-- ============================================================================
-- RLS for every table created in Migrations 1-2. No table in this schema
-- is left without RLS enabled, and no policy in this file uses the
-- forbidden "everyone can do everything" pattern (`using (true)` /
-- `with check (true)` with no ownership predicate) — every policy below is
-- either an explicit ownership check (`auth.uid() = user_id`) or an
-- explicitly-reasoned, narrow public-read grant for shared curriculum
-- content (documented below as intentional, not a placeholder).
--
-- IMPORTANT — verification honesty note (see also DEVELOPMENT_STATUS.md's
-- WP 0.5 section): these policies use `auth.uid()`, the function Supabase's
-- own Postgres/Auth integration provides in a real Supabase project. This
-- repository's sandbox only has a vanilla, local PostgreSQL 17 instance —
-- it has no `auth` schema and no genuine JWT-backed `auth.uid()`. To
-- exercise these exact policies locally, a throwaway, LOCAL-ONLY stub
-- schema/function (`auth.uid()` returning a session-local UUID via
-- `current_setting`) was used in a separate, clearly-labelled test script
-- (NOT part of this migrations/ directory — see
-- supabase/migrations/README.md and the verification section of
-- DEVELOPMENT_STATUS.md). That stub is a LOCAL POSTGRES RLS SIMULATION,
-- not a genuine Supabase-hosted verification. This migration file itself
-- contains no stub — it is written exactly as it should run against a
-- real Supabase project.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Curriculum tables — RLS enabled, explicit public-read policies.
--
-- Curriculum content (paths/courses/modules/lessons/exercises/projects) is
-- shared, non-sensitive, and meant to be readable by anyone using the app
-- (including anonymous/unauthenticated visitors, matching Devora's
-- existing "sign-in is optional" model — see supabase-schema.sql's header
-- comment). `for select using (true)` here is a DELIBERATE, DOCUMENTED
-- "public read of shared content" grant, not the forbidden "everyone can
-- do everything" placeholder — note there is NO corresponding insert/
-- update/delete policy for anon/authenticated roles on any curriculum
-- table below, so writes are only possible via the Postgres role that
-- owns the table (e.g. through the Supabase Dashboard/service role,
-- consistent with curriculum being authored/deployed content, not
-- something end users mutate through the app).
-- ----------------------------------------------------------------------------

alter table learning_paths enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table exercises enable row level security;
alter table projects enable row level security;

drop policy if exists "learning_paths_public_read" on learning_paths;
create policy "learning_paths_public_read" on learning_paths
  for select using (true);

drop policy if exists "courses_public_read" on courses;
create policy "courses_public_read" on courses
  for select using (true);

drop policy if exists "modules_public_read" on modules;
create policy "modules_public_read" on modules
  for select using (true);

drop policy if exists "lessons_public_read" on lessons;
create policy "lessons_public_read" on lessons
  for select using (true);

drop policy if exists "exercises_public_read" on exercises;
create policy "exercises_public_read" on exercises
  for select using (true);

drop policy if exists "projects_public_read" on projects;
create policy "projects_public_read" on projects
  for select using (true);

-- ----------------------------------------------------------------------------
-- profiles — a user may read/create/update only their own profile row.
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- lesson_progress — read / create / update own rows only (per task Task 3:
-- "read their own progress / create their own progress / update their own
-- progress"). No policy grants any access to another user's rows — cross-
-- user access is denied by the absence of a matching USING clause, not by
-- any application-level filtering.
-- ----------------------------------------------------------------------------
alter table lesson_progress enable row level security;

drop policy if exists "lesson_progress_select_own" on lesson_progress;
drop policy if exists "lesson_progress_insert_own" on lesson_progress;
drop policy if exists "lesson_progress_update_own" on lesson_progress;

create policy "lesson_progress_select_own" on lesson_progress
  for select using (auth.uid() = user_id);

create policy "lesson_progress_insert_own" on lesson_progress
  for insert with check (auth.uid() = user_id);

create policy "lesson_progress_update_own" on lesson_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- exercise_attempts — read / create own rows only. Deliberately NO update
-- policy: the task explicitly says "do not unnecessarily allow users to
-- modify historical attempts after creation unless the domain model
-- explicitly requires it," and WP 0.4's createExerciseAttempt() /
-- learning-progress.js header comment establish exercise_attempts as an
-- append-only history (one row per submission) — there is no domain
-- requirement to mutate a past attempt, so no update policy is created.
-- (Evaluating an 'attempted' row to 'passed'/'failed' is expected to be
-- done by a trusted server-side process using the service role, which
-- bypasses RLS by design — not by an authenticated user's own update
-- grant.)
-- ----------------------------------------------------------------------------
alter table exercise_attempts enable row level security;

drop policy if exists "exercise_attempts_select_own" on exercise_attempts;
drop policy if exists "exercise_attempts_insert_own" on exercise_attempts;

create policy "exercise_attempts_select_own" on exercise_attempts
  for select using (auth.uid() = user_id);

create policy "exercise_attempts_insert_own" on exercise_attempts
  for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- project_submissions — read / create / update own rows "where
-- appropriate" (Task 3). Update is granted (a learner may, for example,
-- resubmit into the same row while status is still 'submitted'/
-- 'in-review', or the task's own wording allows an owner-scoped update in
-- general) but is still fully ownership-scoped — a user can only ever
-- update a row where auth.uid() = user_id, both for the existing row
-- (USING) and the new row values (WITH CHECK), so a user can never
-- reassign a submission to someone else or take over another user's row.
-- ----------------------------------------------------------------------------
alter table project_submissions enable row level security;

drop policy if exists "project_submissions_select_own" on project_submissions;
drop policy if exists "project_submissions_insert_own" on project_submissions;
drop policy if exists "project_submissions_update_own" on project_submissions;

create policy "project_submissions_select_own" on project_submissions
  for select using (auth.uid() = user_id);

create policy "project_submissions_insert_own" on project_submissions
  for insert with check (auth.uid() = user_id);

create policy "project_submissions_update_own" on project_submissions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
