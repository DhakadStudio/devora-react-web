-- ============================================================================
-- WP 0.5 — Migration 1 of 4: Canonical curriculum schema
-- ============================================================================
-- Devora — canonical, version-controlled Supabase schema (WP 0.5)
--
-- This migration creates the SHARED / CURRICULUM side of Devora's data
-- model: content that is the same for every learner, following the exact
-- hierarchy locked in PRODUCT_PLAN.md §2 and given a domain-contract shape
-- in WP 0.4's docs/.vitepress/theme/domain/curriculum.js:
--
--   Learning Path -> Course -> Module -> Lesson -> Exercise
--                                      -> Project (optional, per Module)
--
-- IMPORTANT — this migration has NOT been applied to any cloud Supabase
-- project. Supabase cloud is not connected to this repository (see
-- docs/.vitepress/theme/supabase.js / .env.example — no URL/key configured).
-- It was verified against a local, throwaway PostgreSQL 17 instance in the
-- sandbox for syntax/constraint/FK correctness (see DEVELOPMENT_STATUS.md
-- WP 0.5 section for exact verification results). It is written so it can
-- be applied unmodified to a real Supabase project later via
-- `supabase db push` / the Supabase CLI, or pasted into the SQL Editor.
--
-- ----------------------------------------------------------------------------
-- Design decisions (documented here, not silently assumed):
--
-- 1. Stable IDs, not surrogate keys, for every curriculum table. Curriculum
--    ids are authored, human-readable, kebab-case/slash strings (e.g.
--    "javascript/functions-and-scope"), matching WP 0.4's
--    curriculum.js::ID_PATTERN exactly (mirrored below as a CHECK
--    constraint on every `id` column). This keeps the DB schema and the
--    JS domain contracts semantically identical, and is required by
--    DATA_MODEL.md §5's rule that once a Lesson id is referenced by any
--    stored user state, it is permanent — a human-authored slug is the
--    right kind of identifier for that permanence guarantee, not an
--    auto-incrementing integer or a UUID a human could never author by
--    hand while writing curriculum content.
--
-- 2. Ordering via a `position` column, not a stored ordered array on the
--    parent row. WP 0.4's curriculum.js models e.g. Course.moduleIds as an
--    ordered array of ids living ON THE PARENT row. That is the right
--    shape for an in-memory/JS contract, but storing it that way in
--    Postgres would create two competing sources of truth for the
--    parent/child relationship (the array AND the child's FK column) that
--    could silently drift out of sync. Instead, each child table carries
--    its own FK to its parent (the actual relationship) plus a `position`
--    integer (the ordering), and the ordered array WP 0.4's JS layer
--    expects can be reconstructed with
--    `SELECT id FROM children WHERE parent_id = ? ORDER BY position`.
--    This is a deliberate relational-modeling decision, not a deviation
--    from the domain contract's meaning.
--
-- 3. "course/module relationship" (named as its own bullet in the WP 0.5
--    task list) is implemented as `modules.course_id` — a plain foreign
--    key, not a separate many-to-many join table. curriculum.js's
--    createModule() takes a single `courseId`, i.e. every Module belongs
--    to exactly one Course (single-parent hierarchy). A join table would
--    incorrectly imply modules can be shared across multiple courses,
--    which the domain contract does not support. If that ever becomes a
--    real requirement, it is a schema change to make deliberately later,
--    not something to speculatively build now.
--
-- 4. Lessons and Exercises get a nullable `content` JSONB column, RESERVED
--    for WP 0.4's content.js-shaped data (LessonContent's
--    objective/blocks, ExerciseContent's type/language/instructions/
--    starterCode/tests/hints/referenceSolution/options/answerIndex/
--    completionCriteria). This migration does NOT populate it and does
--    NOT add structured columns for those fields, because authoring real
--    curriculum content is explicitly out of scope for WP 0.5. The column
--    exists so a future curriculum-authoring work package can start
--    writing content.js-shaped JSON immediately without a schema
--    migration, while this migration stays focused on hierarchy +
--    referential integrity only.
--
-- 5. Projects are modelled as their own table with a UNIQUE, NOT NULL
--    `module_id`, rather than adding a second `project_id` column on
--    `modules` that points back at `projects`. curriculum.js's
--    createModule() has an optional `projectId`, and createProjectRef()
--    has a required single `moduleId` — the same 1-optional-project-per-
--    module relationship can be fully expressed from the Project side
--    alone (a module "has" a project iff a row in `projects` has that
--    `module_id`), which avoids a circular FK pair and a second place the
--    same fact could get out of sync.
--
-- 6. `profiles` did not exist before this migration. DATA_MODEL.md §1
--    explicitly left "should a dedicated profiles table exist?" as an
--    OPEN QUESTION. WP 0.5 Task 1 explicitly asks for a `profiles` table,
--    which resolves that open question in the affirmative as part of this
--    work package (recorded in DEVELOPMENT_STATUS.md's WP 0.5 section,
--    not silently assumed).
--
-- 7. Curriculum tables intentionally do NOT contain: `completed`,
--    `attempt_count`, `xp_earned`, `last_attempt`, or `user_id`. Those are
--    learner-state concerns and live exclusively in Migration 2's
--    lesson_progress / exercise_attempts / project_submissions tables.
--    This is the "critical separation" the task explicitly requires.
--
-- 8. Known tension with DATA_MODEL.md §2-§7 (documented, not silently
--    resolved): those sections explicitly rule that Path/Course/Module/
--    Lesson/Exercise/Test are "static content... shipped with the build...
--    has no reason to live in a database." WP 0.5's Task 1 explicitly and
--    repeatedly instructs creating exactly these tables in Supabase. This
--    migration follows WP 0.5's explicit, current instructions (the
--    authoritative task for this work package) rather than the earlier
--    WP 0.3 planning-document framing. The practical reason this is a
--    reasonable evolution rather than a contradiction: the learner-state
--    tables in Migration 2 need real foreign keys to validate that a
--    lessonId/exerciseId/projectId a client sends is an actual, current
--    piece of curriculum — which requires the curriculum to exist as
--    rows the database can check against, even if those rows are also
--    (today, and possibly forever) mirrored from build-time authored
--    files rather than edited directly through app UI. This tension is
--    also recorded in DEVELOPMENT_STATUS.md's WP 0.5 section as an
--    explicit "unresolved/decided" note, per the task's documentation
--    requirement — it is not glossed over.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
-- One row per signed-in Supabase Auth user. Deliberately minimal: WP 0.5
-- does not implement auth/profile UI (out of scope) — this table exists so
-- that later work packages have a canonical place to attach user-facing
-- profile fields, and so that user-owned tables in Migration 2 have a
-- natural "the user exists" anchor beyond the raw auth.users row.
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table profiles is
  'Devora — canonical (WP 0.5). One row per Supabase Auth user. Minimal by design; not wired to any UI in WP 0.5.';

-- ----------------------------------------------------------------------------
-- learning_paths
-- ----------------------------------------------------------------------------
create table if not exists learning_paths (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9/-]*[a-z0-9]$'),
  title       text not null,
  summary     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table learning_paths is
  'Devora — canonical (WP 0.5). Top of the curriculum hierarchy. Shared/static content, not user-owned. Mirrors domain/curriculum.js::createLearningPath.';

-- ----------------------------------------------------------------------------
-- courses
-- ----------------------------------------------------------------------------
create table if not exists courses (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9/-]*[a-z0-9]$'),
  path_id     text not null references learning_paths(id) on delete cascade,
  title       text not null,
  summary     text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_courses_path_id on courses(path_id);

comment on table courses is
  'Devora — canonical (WP 0.5). Belongs to exactly one learning_paths row. Mirrors domain/curriculum.js::createCourse.';

-- ----------------------------------------------------------------------------
-- modules  (also satisfies the "course/module relationship" list item —
-- see decision #3 above: implemented as a plain FK, not a join table)
-- ----------------------------------------------------------------------------
create table if not exists modules (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9/-]*[a-z0-9]$'),
  course_id   text not null references courses(id) on delete cascade,
  title       text not null,
  summary     text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_modules_course_id on modules(course_id);

comment on table modules is
  'Devora — canonical (WP 0.5). Belongs to exactly one courses row (the "course/module relationship"). A module''s optional Project is looked up via projects.module_id, not a column here — see decision #5 in this migration''s header comment. Mirrors domain/curriculum.js::createModule.';

-- ----------------------------------------------------------------------------
-- lessons
-- ----------------------------------------------------------------------------
create table if not exists lessons (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9/-]*[a-z0-9]$'),
  module_id   text not null references modules(id) on delete cascade,
  title       text not null,
  position    integer not null default 0,
  -- Reserved for WP 0.4's content.js::LessonContent shape (objective +
  -- blocks). Not populated by this migration — curriculum authoring is
  -- out of scope for WP 0.5. See decision #4 above.
  content     jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_lessons_module_id on lessons(module_id);

comment on table lessons is
  'Devora — canonical (WP 0.5). Belongs to exactly one modules row. `content` is reserved for content.js::LessonContent and intentionally left null by this migration. Mirrors domain/curriculum.js::createLessonRef.';

-- ----------------------------------------------------------------------------
-- exercises
-- ----------------------------------------------------------------------------
create table if not exists exercises (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9/-]*[a-z0-9]$'),
  lesson_id   text not null references lessons(id) on delete cascade,
  title       text not null,
  position    integer not null default 0,
  -- Reserved for WP 0.4's content.js::ExerciseContent shape (type,
  -- language, instructions, starterCode, tests, hints, referenceSolution,
  -- options, answerIndex, completionCriteria). Not populated by this
  -- migration. See decision #4 above.
  content     jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_exercises_lesson_id on exercises(lesson_id);

comment on table exercises is
  'Devora — canonical (WP 0.5). Belongs to exactly one lessons row. `content` is reserved for content.js::ExerciseContent and intentionally left null by this migration. Mirrors domain/curriculum.js::createExerciseRef. Referenced by exercise_attempts (Migration 2) for FK integrity on exerciseId.';

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
create table if not exists projects (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9/-]*[a-z0-9]$'),
  -- unique + not null: at most one Project per Module, and every Project
  -- belongs to exactly one Module (see decision #5 above).
  module_id   text not null unique references modules(id) on delete cascade,
  title       text not null,
  brief       text,
  rubric      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_projects_module_id on projects(module_id);

comment on table projects is
  'Devora — canonical (WP 0.5). Optional module-level capstone. Belongs to exactly one modules row (unique module_id). Mirrors domain/curriculum.js::createProjectRef exactly (id, moduleId, title, brief, rubric). Referenced by project_submissions (Migration 2) for FK integrity on projectId.';
