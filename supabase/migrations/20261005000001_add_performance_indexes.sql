-- ============================================================================
-- WP 0.6 — Performance Optimization: Add Missing Indexes
-- ============================================================================
-- This migration adds indexes for columns used in ORDER BY clauses to
-- prevent sequential scans and improve query performance.

-- ----------------------------------------------------------------------------
-- Indexes for curriculum tables — improve ordering performance
-- ----------------------------------------------------------------------------

-- learning_paths ordered by title in listPaths() and listPathsTree()
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_learning_paths_title') then
    create index idx_learning_paths_title on learning_paths(title);
  end if;
end $$;

-- courses ordered by position in listCourses()
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_courses_position') then
    create index idx_courses_position on courses(position);
  end if;
end $$;

-- modules ordered by position in listModules()
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_modules_position') then
    create index idx_modules_position on modules(position);
  end if;
end $$;

-- lessons ordered by position in listLessons()
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_lessons_position') then
    create index idx_lessons_position on lessons(position);
  end if;
end $$;

-- Optional: index for learning_paths.position if ever needed
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_learning_paths_position') then
    create index idx_learning_paths_position on learning_paths(position);
  end if;
end $$;

-- ============================================================================
-- Verification
-- ============================================================================
-- After applying this migration, queries that previously did sequential scans
-- will use index lookups, improving performance from O(N) to O(log N).

-- Example query that will benefit:
-- SELECT * FROM learning_paths ORDER BY title;
--
-- Before: Sequential scan (slow with many paths)
-- After: Index scan (fast even with many paths)