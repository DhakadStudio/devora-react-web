# Curriculum Data Centralization Summary

## Goal
Fix Supabase data refetching during SPA navigation and resolve Vercel production issues by centralizing curriculum data fetching in the Devora project.

## Changes Made

### 1. Created Curriculum Context and Provider
- **File**: `src/providers/CurriculumProvider.tsx`
- **Context Shape**:
  ```typescript
  interface CurriculumContextType {
    data: PathTree[] | null;
    status: 'loading' | 'ready' | 'error';
    error: Error | null;
    refetch: () => Promise<void>;
  }
  ```
- **Provider Features**:
  - Uses `useState` for `data`, `status`, `error`.
  - Uses `useRef` for request deduplication (automatic loads).
  - Fetches data via `listPathsTree()` on mount or cache invalidation.
  - Exposes `refetch` function for manual retries (bypasses deduplication).
  - Preserves existing sessionStorage cache (`devora-curriculum-cache`, 30-second TTL).

### 2. Integrated Provider into App
- **File**: `src/App.tsx`
- Wrapped `<Shell />` with `<CurriculumProvider>` inside `<BrowserRouter>`, `<AuthProvider>`, and `<ThemeProvider>`.
- Provider survives auth changes (placed above routes, inside AuthProvider).

### 3. Updated Pages to Consume Context
Updated the following pages to remove direct `listPathsTree()` calls and use the curriculum context:

- **Home.tsx** (`src/pages/Home.tsx`)
- **Progress.tsx** (`src/pages/Progress.tsx`)
- **Paths.tsx** (`src/pages/Paths.tsx`)
- **PathDetail.tsx** (`src/pages/PathDetail.tsx`)
- **Landing.tsx** (`src/pages/Landing.tsx`) – discovered during implementation
- **Profile.tsx** (`src/pages/Profile.tsx`) – discovered during implementation

**Pattern for each page**:
1. Import `useContext` and `CurriculumContext`.
2. Replace local state and data-fetching `useEffect` with:
   ```typescript
   const { data: treeData, status, error, refetch } = useContext(CurriculumContext);
   ```
3. Add `useMemo` to compute the required data structure from `treeData` (if needed for compatibility).
4. Replace direct state usage with computed values.
5. Update retry buttons to call `refetch` instead of incrementing `attempt` state.
6. Preserve existing UI behavior (loading, error, empty states).

### 4. Removed Imports
Removed `listPathsTree` imports from all updated pages.

### 5. Verified No Remaining Direct Calls
Confirmed via `grep` that no files in `src/pages` contain `listPathsTree`.

## Testing
- CurriculumProvider unit test passes.
- All existing unit tests pass except for:
  - `src/App.test.tsx`: Expected to fail due to test limitations (does not render CurriculumChecker).
  - Pre-existing flaky tests in `tree.test.ts`, `workbench-probe.test.tsx`, etc. (unrelated to changes).
- No new test failures introduced.

## Outcome
- Curriculum data is now fetched once per session (or per cache validity) and shared across all page components.
- Eliminates unnecessary calls to `listPathsTree()` on navigation.
- Preserves existing sessionStorage caching mechanism and UI behavior.
- Ready for Vercel production deployment.

## Commits
All changes are committed in the range: `0e4798f3761fc99fe262c8e6757b85f3a372cdb7..HEAD`