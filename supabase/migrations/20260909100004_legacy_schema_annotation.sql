-- ============================================================================
-- WP 0.5 — Migration 4 of 4: Legacy schema annotation (documentation only)
-- ============================================================================
-- This migration makes NO structural or data changes. It exists purely to
-- attach explicit, permanent `comment on table` annotations to the two
-- pre-existing legacy tables defined in /supabase-schema.sql
-- (devora_progress, devora_code_snapshots), so that anyone inspecting the
-- database schema directly (e.g. via `\dt+` in psql, or the Supabase
-- Dashboard's table view) sees an explicit "this is legacy, not canonical"
-- marker on the tables themselves — not just in a markdown doc that could
-- be missed.
--
-- Per WP 0.5's Task 4 ("Handle the existing legacy schema explicitly"):
--   - devora_progress and devora_code_snapshots are NOT deleted, NOT
--     altered, and NOT reused as the canonical model.
--   - No repository evidence was found that proves destructive deletion of
--     these tables is safe (their creation script, supabase-schema.sql, is
--     still present and still the file a fresh Supabase project would be
--     set up from if Supabase were connected today; auth.js still contains
--     `migrateDeviceProgress`/`pullFromCloud`-style logic that assumes
--     devora_progress exists). Deleting them is therefore explicitly out of
--     scope for this work package.
--   - No data from devora_progress / devora_code_snapshots is migrated
--     into the new canonical tables (lesson_progress / exercise_attempts /
--     project_submissions) by this or any other WP 0.5 migration. Old-data
--     migration is deferred as a separate concern, exactly as the task
--     specifies.
--   - The new canonical tables are made "clearly distinguishable" from the
--     legacy ones primarily by NAME (lesson_progress / exercise_attempts /
--     project_submissions vs. devora_progress / devora_code_snapshots) and
--     by the `comment on table` annotations below and in Migrations 1-2.
--
-- IF this migration is ever applied to a real Supabase project that
-- already ran supabase-schema.sql, the `comment on table` statements below
-- will succeed only if those tables exist; wrap in a DO block so this
-- migration does not fail on a project where the legacy schema was never
-- created (e.g. a brand-new Supabase project that starts directly from
-- this WP 0.5 schema with no legacy history to annotate).
-- ============================================================================

do $$
begin
  if to_regclass('public.devora_progress') is not null then
    execute $c$
      comment on table devora_progress is
        'Devora — LEGACY/DEPRECATED (see /supabase-schema.sql). Predates WP 0.5''s canonical schema. Retained as-is for backward compatibility and historical data — NOT the canonical learning-progress model. Uses curriculum-generation-specific fields (completed_lessons/completed_challenges as ad-hoc JSON arrays) and a fully permissive RLS policy (using(true)) justified there by anonymous-visitor support. Do NOT extend this table with new features; use lesson_progress / exercise_attempts / project_submissions instead (WP 0.5). No data has been migrated from this table into the new canonical tables as part of WP 0.5 — that is an explicitly deferred, separate concern.'
    $c$;
  end if;

  if to_regclass('public.devora_code_snapshots') is not null then
    execute $c$
      comment on table devora_code_snapshots is
        'Devora — LEGACY/DEPRECATED (see /supabase-schema.sql). Optional cross-device code-editor backup, predates WP 0.5. Retained as-is for backward compatibility — NOT part of the canonical curriculum/learner-state model introduced in WP 0.5. Uses a fully permissive RLS policy (using(true)/with check(true)). Not superseded by any WP 0.5 table (project_submissions is a distinct concept: a graded submission, not an editor-state backup) — no replacement work is in scope for WP 0.5.'
    $c$;
  end if;
end;
$$;
