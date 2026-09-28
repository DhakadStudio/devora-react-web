-- ============================================================================
-- WP 0.5 — Migration 2 of 4: Learner-state tables
-- ============================================================================
-- Database persistence equivalents of WP 0.4's
-- docs/.vitepress/theme/domain/learning-progress.js domain contracts:
-- LessonProgress, ExerciseAttempt, ProjectSubmission. These are USER-OWNED
-- state tables — the tables Migration 3 will enable RLS on.
--
-- Per DATA_MODEL.md §12's anti-pattern-prevention rule, these tables are
-- deliberately generic: they reference curriculum ids (lesson_id /
-- exercise_id / project_id) and nothing about *how* that curriculum content
-- was authored or generated. They must keep working unchanged regardless of
-- which content-authoring system produced the referenced ids — this is the
-- exact failure mode that made the old progress.js's `completedSubtopics` /
-- `completedTopicTests` fields dead weight after the Gen-1/Gen-2 curriculum
-- generators they were coupled to were deleted (see ARCHITECTURE_AUDIT.md).
--
-- NOT applied to any cloud Supabase project — see Migration 1's header
-- comment and DEVELOPMENT_STATUS.md's WP 0.5 section for exact verification
-- performed (local PostgreSQL 17 in the sandbox only).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- lesson_progress
-- ----------------------------------------------------------------------------
-- Lifecycle state is an explicit 3-value enum (never a boolean), matching
-- learning-progress.js::LESSON_PROGRESS_STATUS exactly: not-started /
-- in-progress / completed. UNIQUE(user_id, lesson_id) is the intended model
-- per the task ("prevent duplicate progress records for the same
-- user/lesson") — a learner has at most one current progress row per
-- Lesson; re-entering a Lesson updates that same row's status/timestamps
-- rather than inserting a new one. This mirrors createLessonProgress()'s
-- state-machine invariants (startedAt/completedAt null-ness rules) at the
-- DB level via a CHECK constraint so the database can't hold data the JS
-- domain contract would reject.
create table if not exists lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  lesson_id     text not null references lessons(id) on delete cascade,
  status        text not null default 'not-started'
                  check (status in ('not-started', 'in-progress', 'completed')),
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint lesson_progress_user_lesson_unique unique (user_id, lesson_id),

  -- Mirrors learning-progress.js::createLessonProgress's exact invariants:
  --   not-started -> started_at and completed_at both null
  --   in-progress -> started_at required, completed_at must be null
  --   completed   -> started_at and completed_at both required, and
  --                  started_at <= completed_at
  constraint lesson_progress_state_shape check (
    (status = 'not-started' and started_at is null and completed_at is null)
    or (status = 'in-progress' and started_at is not null and completed_at is null)
    or (status = 'completed' and started_at is not null and completed_at is not null
        and started_at <= completed_at)
  )
);

create index if not exists idx_lesson_progress_user_id on lesson_progress(user_id);
create index if not exists idx_lesson_progress_lesson_id on lesson_progress(lesson_id);

comment on table lesson_progress is
  'Devora — canonical (WP 0.5). User-owned. One row per (user_id, lesson_id) — re-entering a Lesson updates this row, never inserts a duplicate. Mirrors domain/learning-progress.js::createLessonProgress exactly, including its status/timestamp invariants (enforced here via CHECK). RLS enabled in Migration 3.';

-- ----------------------------------------------------------------------------
-- exercise_attempts
-- ----------------------------------------------------------------------------
-- ONE ROW PER SUBMISSION — history is preserved, never overwritten. This is
-- the explicit decision already made in WP 0.4's learning-progress.js
-- header comment ("the decision from WP 0.4 is: one record per submission/
-- attempt... the richer shape, chosen because it is a strict superset of
-- the boolean-only shape"). Accordingly there is deliberately NO unique
-- constraint on (user_id, exercise_id) — a learner may have many attempts
-- at the same Exercise over time, and each is its own row.
--
-- Fields are limited to exactly what createExerciseAttempt() defines:
-- status, submitted content (code XOR selected option), attempted/evaluated
-- timestamps, optional feedback. No execution logs, no keystroke history,
-- no stdout/stderr dumps — those are explicitly out of scope per the task
-- ("do not store excessive execution logs or every editor keystroke").
create table if not exists exercise_attempts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  exercise_id            text not null references exercises(id) on delete cascade,
  status                 text not null
                           check (status in ('attempted', 'passed', 'failed')),
  -- Mutually exclusive per createExerciseAttempt(): exactly one of these
  -- two must be set, matching the 'free-code'/'debug-fix' vs
  -- 'multiple-choice' Exercise-type split in content.js.
  submitted_code         text,
  selected_option_index  integer,
  attempted_at           timestamptz not null default now(),
  evaluated_at           timestamptz,
  feedback               text,

  constraint exercise_attempts_submission_xor check (
    (submitted_code is not null and selected_option_index is null)
    or (submitted_code is null and selected_option_index is not null)
  ),

  -- Mirrors createExerciseAttempt()'s evaluatedAt invariants:
  --   attempted        -> evaluated_at must be null
  --   passed / failed  -> evaluated_at required, and >= attempted_at
  constraint exercise_attempts_evaluation_shape check (
    (status = 'attempted' and evaluated_at is null)
    or (status in ('passed', 'failed') and evaluated_at is not null
        and evaluated_at >= attempted_at)
  )
);

create index if not exists idx_exercise_attempts_user_id on exercise_attempts(user_id);
create index if not exists idx_exercise_attempts_exercise_id on exercise_attempts(exercise_id);
-- Supports "does this user have any passed attempt at this exercise?"
-- lookups (deriving "ever passed" from attempt history, per
-- learning-progress.js's header comment) without a full table scan.
create index if not exists idx_exercise_attempts_user_exercise on exercise_attempts(user_id, exercise_id);

comment on table exercise_attempts is
  'Devora — canonical (WP 0.5). User-owned. ONE ROW PER SUBMISSION — history is never overwritten (deliberate decision from WP 0.4). No unique(user_id, exercise_id) constraint by design. Mirrors domain/learning-progress.js::createExerciseAttempt exactly, including its submitted-content XOR and evaluation-timestamp invariants (enforced here via CHECK). RLS enabled in Migration 3 (read + create only — no update policy; see Migration 3''s header comment).';

-- ----------------------------------------------------------------------------
-- project_submissions
-- ----------------------------------------------------------------------------
-- Deliberately small first implementation: the submitted artifact is
-- stored as plain `text` (either the actual submitted content, e.g. code,
-- or a stable reference/URL to it — createProjectSubmission()'s
-- `submittedArtifact` doc comment allows either). This is NOT a
-- file-storage or version-control system — no history of edits, no
-- multi-file support, no binary storage. If Devora later needs richer
-- artifact storage (e.g. Supabase Storage, multi-file projects), that is a
-- deliberate future schema change, not something to speculatively build
-- now (explicitly out of scope per the task: "Do NOT design a complete
-- file-storage/version-control system in this package").
create table if not exists project_submissions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  project_id           text not null references projects(id) on delete cascade,
  status               text not null default 'submitted'
                         check (status in ('submitted', 'in-review', 'passed', 'needs-revision')),
  submitted_artifact   text not null,
  submitted_at         timestamptz not null default now(),
  reviewed_at          timestamptz,
  review_notes         text,

  -- Mirrors createProjectSubmission()'s reviewedAt invariants:
  --   submitted / in-review    -> reviewed_at must be null
  --   passed / needs-revision  -> reviewed_at required, and >= submitted_at
  constraint project_submissions_review_shape check (
    (status in ('submitted', 'in-review') and reviewed_at is null)
    or (status in ('passed', 'needs-revision') and reviewed_at is not null
        and reviewed_at >= submitted_at)
  )
);

create index if not exists idx_project_submissions_user_id on project_submissions(user_id);
create index if not exists idx_project_submissions_project_id on project_submissions(project_id);

comment on table project_submissions is
  'Devora — canonical (WP 0.5). User-owned. `submitted_artifact` is a deliberately small text field (raw content or a reference/URL) — not a file-storage/VCS system. Multiple submissions per (user_id, project_id) are allowed (no unique constraint), matching "needs-revision -> resubmit" as a real, expected flow. Mirrors domain/learning-progress.js::createProjectSubmission exactly, including its review-timestamp invariants (enforced here via CHECK). RLS enabled in Migration 3.';
