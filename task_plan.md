# Devora V1 (Tier 1 core loop) — Spec + Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Devora V1 — the Tier 1 core loop (curriculum discovery → lesson engine → exercise engine → workspace → run/pass/progress-saved), architected around five engines so every Tier 2-4 feature can be added later as new modules, not rewrites.

**Architecture:** Five engines with explicit typed public interfaces (Curriculum, Learning, Execution, Progress, Project) living in `src/engines/`; pages import only engine public APIs; engines import `src/lib/supabase.ts` + generated types; nothing outside an engine touches engine internals. Curriculum is DB-driven from the live Supabase project (already migrated + seeded). Execution goes through an `ExecutionProvider` interface with a browser-JS provider and a Judge0-backed provider. Progress is local-first (guests) with Supabase sync (signed-in).

**Tech Stack:** React 19 + TypeScript (strict) + React Router 7 + Monaco + Supabase JS v2 + vitest + @testing-library. Judge0 CE public endpoint (`https://ce.judge0.com`).

**Spec:** This file (§A Spec, §B Plan). The spec and plan travel together by design (planning-with-files).

---

## A. SPEC

### A1. Mission + critical loop

The one flow that must be rock solid: **open lesson → write code → run → pass → progress saved**. It must work for guests (localStorage) and signed-in users (Supabase sync). If this loop breaks, nothing else matters.

### A2. Five-engine boundaries

```
pages/ (existing routes, rewired)
  └─▶ engines/ (public API only)
        └─▶ lib/supabase.ts + generated DB types
```

| Engine | Directory | Public API (all others may import ONLY these) |
|---|---|---|
| Curriculum | `src/engines/curriculum/` | `listPaths()`, `getPath(id)`, `listCourses(pathId)`, `getCourse(id)`, `listModules(courseId)`, `listLessons(moduleId)`, `getLesson(lessonId)`, `getExercise(exerciseId)` |
| Learning | `src/engines/learning/` | stage model (`lessonStages(content)`), exercise runner (`runExercise(exercise, code)`), hint stepper (`useHints`), exercise types |
| Execution | `src/engines/execution/` | `ExecutionProvider`, `runCode(req)`, `ExecRequest`, `ExecResult`, `DEFAULT_LIMITS` |
| Progress | `src/engines/progress/` | `useProgress()`, `moduleState()`, `pathCompletion()`, `firstUnfinishedLesson()`, status types |
| Project | `src/engines/project/` | `getProjectForModule(moduleId)`, `submitProject(...)` |

Rules:
- Engines never import each other's internals; cross-engine needs go through public APIs only.
- All exercise grading is I/O-based (`stdin`/`expectedOutput`) — provider-agnostic. New exercise types (SQL, fill-missing, etc.) are **new JSONB rows**, never new engines.
- Future Tier 2-4 (XP, AI tutor, admin, certificates, ads) attach to the five engines without modifying them.

### A3. Data (live Supabase, verified 2026-09-28)

- Schema applied: `profiles`, `learning_paths`, `courses`, `modules`, `lessons`, `exercises`, `projects`, `lesson_progress`, `exercise_attempts`, `project_submissions` — RLS enabled on all 10, ownership-scoped.
- Content seeded: path `javascript-fundamentals` → course `javascript-fundamentals/core` → modules `.../foundations` (5 lessons), `.../logic-loops-data` (7 lessons); 12 lessons, 14 exercises.
- Lesson `content` JSONB: `{ id, kind, objective, blocks[] }`; block types: `explanation` (body), `example` (code, caption, language), `interactive` (language, description, starterCode), `question` (prompt, options, answerIndex, explanation), `exercise` (exerciseId), `reflection` (prompt).
- Exercise `content` JSONB: `{ id, kind, type, language, instructions, starterCode, tests[], hints[], options, answerIndex, expectedBehavior, referenceSolution, completionCriteria }`. Types in DB: `free-code`, `debug-fix` (I/O tests), `multiple-choice` (tests: [], graded via options/answerIndex). `language` null for multiple-choice.
- Test shape: `{ kind: 'exercise-test', stdin: string, description: string, expectedOutput: string }`.
- `lesson_progress` currently has 0 rows; status enum currently `not-started/in-progress/completed`.

### A4. DB changes — ONE additive migration (no destructive rewrites)

1. `lesson_progress.status` CHECK → V1 state set `{not-started, started, attempted, passed, completed}` (table empty; `in-progress` retired — Ruling recorded in ledger). State shape: not-started → both timestamps null; started/attempted/passed → started_at set, completed_at null; completed → both set, started_at <= completed_at. Revisited/mastered/struggling added later as enum extensions (one ALTER each).
2. `exercise_attempts` + `hints_used integer not null default 0` (hint usage tracked per attempt).
3. `learning_paths` + `level text`, `hours numeric`, `prerequisites text`, `outcomes jsonb not null default '[]'` (discovery: difficulty/time/prereqs/outcomes).
4. `projects` + `guide_level text not null default 'guided' check (guided|partially-guided|independent|portfolio)` (level as data, not code paths).
5. Seed (data-only): update path row's discovery fields; insert one guided project (`javascript-fundamentals/core/foundations/intro-card`) with 3-requirement rubric.
6. All existing RLS policies untouched; new columns inherit table RLS.

### A5. Execution

- `ExecutionProvider` interface: `{ id, languages[], run(req) }`; `ExecRequest { language, code, stdin?, limits? }`; `ExecResult { status, stdout, stderr, error? }`; status ∈ ok | runtime-error | timeout | compile-error | no-provider.
- `error` is educational: `{ message (what happened), expected (what was expected), nextStep }` — never a bare error.
- Providers: `browser-js` (sandboxed iframe, adapts existing `src/lib/runner.ts`; JS only), `judge0` (ce.judge0.com submit + poll, base64-encoded, deadline = timeoutMs; python + future non-JS).
- Registry `runCode(req)` picks provider by language; unknown language → `no-provider` educational error.
- Vercel (app server) never executes user code. Timeout, memory and output limits enforced at the provider.

### A6. Progress

- `LessonStatus` = `not-started | started | attempted | passed | completed` (enum, never boolean).
- `ModuleState` derived from lesson statuses: all completed → completed; any passed → passed; any attempted → attempted; any started → started; else not-started.
- Guests: localStorage only. Signed-in: mutations mirror to `lesson_progress` (upsert by user_id+lesson_id) and `exercise_attempts` (insert, append-only); on sign-in, DB state merges in (later timestamp wins). Offline/DB failure → local-only, graceful.
- Hint usage per attempt: `hints_used` on `exercise_attempts`.

### A7. Auth

Supabase auth (sign up/in/out, OAuth — exists) + **password reset** (`resetPasswordForEmail` + `updateUser({ password })`). Public browsing preserved for curriculum pages.

### A8. Explicitly deferred (do not build; do not block)

XP, achievements, streaks, search, authoring UI, content versioning, portfolio pages, analytics, admin, AI tutor, adaptive learning, certificates, notifications, ads, social. Existing Challenges pages stay on legacy local data (outside the five engines; DB migration later is additive). Playwright E2E: NOT used (user decision) — vitest integration E2E only.

### A9. Testing

- TDD per engine: failing test first, watch it fail, minimal code, watch it pass (vitest).
- The critical loop E2E: real Lesson page + real engines/stores; ONLY the network boundary (supabase client) mocked; Monaco stubbed as textarea via test utility. Guest + signed-in variants.
- RLS policies verified via SQL tests before V1 is done.

## B. PLAN

### Global Constraints

- React 19 + TS strict; keep React Router 7 + Monaco; no second framework/router.
- All DB changes additive; never touch existing RLS policies; never commit secrets (.env* is gitignored).
- All execution via `ExecutionProvider`; no app code constructs Judge0 requests outside `src/engines/execution/judge0.ts`.
- Engines expose typed public interfaces only; no cross-engine internal imports.
- Guests: localStorage; signed-in: Supabase sync; degrade gracefully offline.
- Educational errors everywhere: what happened / what was expected / next step.
- TDD: no production code without a failing test first.
- Commit after every green test run; work on branch `v1-core` in `~/devora-react-web`.

### Review Focus

1. Empty stdin variants — a test with `stdin: ""` vs absent stdin key must both work (normalize + default).
2. Trailing-newline output mismatch — stdout `"x\n"` vs expectedOutput `"x"` must PASS (normalized), but `"x y"` vs `"x"` must FAIL.
3. Guest → signed-in transition mid-lesson — local progress must merge, never reset.
4. DB unreachable at lesson open — explicit retry state, never a blank page or silent crash.
5. Unknown exercise type in DB — graceful fallback UI, never a crash.

---

### Task 1: Additive DB migration + DB types (controller-run — requires Supabase MCP)

**Files:**
- Create: `supabase/migrations/20260928000001_v1_additive_state_and_discovery.sql` (copy migrations 1-4 from `~/Devora/supabase/migrations/` first)
- Create: `src/lib/types/db.generated.ts` (generated via Supabase MCP)

**Interfaces:**
- Produces: DB tables with V1 state set, `hints_used`, path discovery columns, `guide_level`, one seeded guided project; generated `Database` types for the engines.

- [ ] Copy migrations 1-4 from `~/Devora/supabase/migrations/` into `supabase/migrations/`
- [ ] Write migration 5 per §A4 (exact SQL in migration file; comment documents the `in-progress` retirement ruling)
- [ ] Apply via supabase MCP `apply_migration`
- [ ] Verify: columns exist, path row updated, project row inserted, status CHECK accepts V1 set
- [ ] Run advisors (security) — fix any issues
- [ ] Generate TS types into `src/lib/types/db.generated.ts`
- [ ] Commit

### Task 2: Vitest test setup (controller-run, mechanical)

**Files:**
- Modify: `package.json` (add vitest, @testing-library/react, @testing-library/jest-dom, jsdom; script `test:units`)
- Create: `vitest.config.ts` (jsdom environment)
- Create: `src/test/setup.ts` (jest-dom matchers, localStorage mock hygiene)

- [ ] Install dev deps (pin versions, commit lockfile)
- [ ] Create config + setup; `npm run test:units` runs green on a smoke test
- [ ] Commit

### Task 3: Curriculum engine (TDD) — subagent

**Files:**
- Create: `src/engines/curriculum/content.ts` — `LessonBlock`, `LessonContent`, `ExerciseType`, `ExerciseContent`, `ExerciseTest` types exactly per §A3 + a `parseLessonContent`/`parseExerciseContent` validator
- Create: `src/engines/curriculum/index.ts` — public API per §A2, Supabase-backed, session cache
- Test: `src/engines/curriculum/index.test.ts` (mock supabase client at module boundary)

**Interfaces:**
- Consumes: `src/lib/supabase.ts` (existing client)
- Produces: exact signatures per §A2; `PathSummary { id, title, summary, level, hours, prerequisites, outcomes }`; `CourseSummary { id, title, summary, position }`; `ModuleSummary { id, title, summary, position }`; `LessonRef { id, title, position }`

- [ ] RED: tests for listPaths/getPath/listCourses/listModules/getLesson/getExercise + malformed-content validation + cache behavior → watch fail
- [ ] GREEN: implement → watch pass
- [ ] Commit

### Task 4: Execution engine (TDD) — subagent

**Files:**
- Create: `src/engines/execution/types.ts` — `ExecRequest`, `ExecResult`, `ExecStatus`, `ExecutionProvider`, `ExecLimits` per §A5
- Create: `src/engines/execution/browser-js.ts` — iframe sandbox provider (adapts `src/lib/runner.ts` console-capture approach)
- Create: `src/engines/execution/judge0.ts` — submit + poll provider (base64-encoded; ONLY file allowed to know Judge0)
- Create: `src/engines/execution/index.ts` — `runCode()` registry + `DEFAULT_LIMITS`
- Test: `src/engines/execution/index.test.ts` (registry + no-provider educational error), `src/engines/execution/judge0.test.ts` (mock fetch: submit body shape, poll until terminal, timeout, error mapping)

**Interfaces:**
- Produces: `runCode(req: ExecRequest): Promise<ExecResult>`; provider selection: `javascript` → browser-js, others → judge0, unknown → no-provider educational error

- [ ] RED: registry + judge0 tests → watch fail
- [ ] GREEN: implement → watch pass
- [ ] Commit

### Task 5: Progress engine (TDD) — subagent

**Files:**
- Create: `src/engines/progress/types.ts` — `LessonStatus`, `LESSON_STATUSES`, `ModuleState` per §A6
- Create: `src/engines/progress/store.ts` — local-first store (adapts `src/lib/progress.ts`): `LocalProgressState`, mutations (`openLesson`, `recordAttempt`, `completeLesson`, `saveCode`, `saveReflection`, `recordActivity`, `resetAll`, `mergeRemote`)
- Create: `src/engines/progress/sync.ts` — `pushLessonProgress`, `pushExerciseAttempt`, `pullProgress` (signed-in only)
- Create: `src/engines/progress/index.ts` — `useProgress()`, `moduleState(state, lessonIds)`, `pathCompletion(state, lessonIds)`, `firstUnfinishedLesson(lessons, state)`
- Test: `src/engines/progress/store.test.ts` (enum transitions, merge rules), `src/engines/progress/index.test.ts` (moduleState derivation, selectors), `src/engines/progress/sync.test.ts` (mock supabase: upsert shape, pull+merge)

**Interfaces:**
- Consumes: `src/lib/supabase.ts`, `src/lib/auth.tsx` (session state)
- Produces: `useProgress()` returning `[LocalProgressState, actions]`; `moduleState(lessonIds, states): ModuleState`

- [ ] RED: store/derivation/sync tests → watch fail
- [ ] GREEN: implement → watch pass
- [ ] Commit

### Task 6: Learning engine (TDD) — subagent

**Files:**
- Create: `src/engines/learning/stages.ts` — `lessonStages(content): LessonStage[]` from §A3 block types
- Create: `src/engines/learning/exercise.ts` — `runExercise(exercise, code, runCode): Promise<ExerciseRunResult>`; groups tests by stdin, one run per group, normalized comparison (trim trailing whitespace); `ExerciseRunResult { testResults: { description, stdin, expectedOutput, actualOutput, passed }[], allPassed }`; educational errors
- Create: `src/engines/learning/hints.ts` — `useHints(exercise)`: hint 1 → 2 → 3 → explanation fallback, per-attempt usage count
- Create: `src/engines/learning/mc.ts` — multiple-choice grading (`options`/`answerIndex`)
- Test: `src/engines/learning/exercise.test.ts` (per-case pass/fail, stdin grouping, normalization per Review Focus 1-2), `src/engines/learning/hints.test.ts`, `src/engines/learning/mc.test.ts`, `src/engines/learning/stages.test.ts`

**Interfaces:**
- Consumes: curriculum engine types, `runCode` from execution engine (public API)
- Produces: `runExercise`, `lessonStages`, `useHints`, `gradeMultipleChoice`

- [ ] RED: tests → watch fail
- [ ] GREEN: implement → watch pass
- [ ] Commit

### Task 7: Project engine + auth password reset (TDD) — subagent

**Files:**
- Create: `src/engines/project/index.ts` — `getProjectForModule(moduleId)`, `submitProject(userId, projectId, artifact)`, `GuidedProject` type
- Modify: `src/lib/auth.tsx` — add `requestPasswordReset(email)`, `updatePassword(newPassword)` (additive only)
- Test: `src/engines/project/index.test.ts` (mock supabase), `src/lib/auth.test.tsx` (mock supabase)

- [ ] RED: tests → watch fail
- [ ] GREEN: implement → watch pass
- [ ] Commit

### Task 8: Rewire discovery pages (Home/Paths/PathDetail) — subagent

**Files:**
- Modify: `src/pages/Home.tsx`, `src/pages/Paths.tsx`, `src/pages/PathDetail.tsx`
- Modify: `src/lib/progress.ts` imports removed where replaced (challenges data stays for Challenges pages)

**Interfaces:**
- Consumes: curriculum engine public API, progress engine public API

- [ ] Home: continue-learning card + progress from engines; loading/error states (Review Focus 4)
- [ ] Paths: list paths from DB with level/hours/prereqs/outcomes
- [ ] PathDetail: course sequence + module list + per-module progress (moduleState) + module project link
- [ ] typecheck + units green; Commit

### Task 9: Lesson workspace rewire — subagent

**Files:**
- Modify: `src/pages/Lesson.tsx` — stages from `lessonStages()`, workspace instructions|editor|output, run/reset/hint/submit, per-case results with pass/fail, educational errors, completion via exercise passed → progress saved
- Modify: `src/components/CodeEditor.tsx`, `src/components/OutputBar.tsx`, `src/components/HintStepper.tsx`, `src/components/TestCases.tsx` as needed

**Interfaces:**
- Consumes: curriculum, learning, execution, progress engine public APIs

- [ ] Lesson page renders stages from DB content (objective → explanation/example/interactive → question → exercise → reflection)
- [ ] Run → per-case results (pass/fail individually); Reset; progressive hints; Submit → recordAttempt + completeLesson
- [ ] Educational errors (message/expected/nextStep); guest + signed-in progress both saved
- [ ] Responsive: instructions → editor → run → output stacked on mobile; keyboard nav + focus states
- [ ] typecheck + units green; Commit

### Task 10: Playground + Progress + Project pages — subagent

**Files:**
- Modify: `src/pages/Playground.tsx` (language picker js/python via runCode, local save)
- Modify: `src/pages/Progress.tsx` (module states from progress engine)
- Create: `src/pages/Project.tsx` (guided project: brief, requirement checklist, submit) + route `/project/:projectId`
- Modify: `src/App.tsx` (route), `src/pages/Login.tsx` + `src/pages/Signup.tsx` (password reset links), `src/pages/ResetPassword.tsx` (new)

- [ ] Playground: js → browser provider, python → judge0 provider (via runCode only), saves locally
- [ ] Progress: per-module state chips
- [ ] Project: guided level checklist + submit via project engine
- [ ] Password reset flow end-to-end
- [ ] typecheck + units green; Commit

### Task 11: E2E critical loop (TDD) — subagent

**Files:**
- Create: `src/test/mocks/supabase.ts` (network-boundary mock), `src/test/mocks/editor.tsx` (textarea Monaco stub)
- Test: `src/test/e2e/critical-loop.test.tsx` — real Lesson page + real engines; guest variant + signed-in variant

- [ ] RED: E2E test → watch fail (against pre-rewire code if needed)
- [ ] GREEN: make pass against the wired app
- [ ] Flow asserted: open lesson → type passing code → run → per-case pass → progress saved (localStorage for guest; supabase upsert called for signed-in)
- [ ] Commit

### Task 12: Final verification + whole-branch review

- [ ] RLS verified via SQL policy tests (anon cannot read user rows; owner can)
- [ ] `npm run typecheck` + all units + build green
- [ ] Supabase advisors clean
- [ ] No Tier 2-4 feature made harder to add (spec §A8 check)
- [ ] Whole-branch review; fix findings
- [ ] Merge `v1-core` → `main`; push to GitHub

---

## Ledger

_(progress tracked here + in `.sdd-ledger.md`)_
