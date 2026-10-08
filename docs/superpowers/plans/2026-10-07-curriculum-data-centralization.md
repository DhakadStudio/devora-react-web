# Curriculum Data Centralization Implementation Plan

## Scope Check
This plan focuses on centralizing curriculum data fetching to prevent unnecessary Supabase requests during SPA navigation. It does not involve multiple independent subsystems.

## File Structure
- `src/providers/CurriculumProvider.tsx` - New file implementing the curriculum context and provider.
- `src/App.tsx` - Modified to wrap the application with `CurriculumProvider`.
- `src/pages/Home.tsx` - Modified to consume curriculum context instead of fetching directly.
- `src/pages/Progress.tsx` - Modified to consume curriculum context.
- `src/pages/Paths.tsx` - Modified to consume curriculum context.
- `src/pages/PathDetail.tsx` - Modified to consume curriculum context.
- `src/pages/ChallengeDetail.tsx` - Modified if it uses curriculum data (to be verified).
- `src/pages/Lesson.tsx` - Modified if it uses curriculum data (to be verified).
- `src/engines/curriculum/index.ts` - Unchanged (retain existing caching logic).
- `src/lib/supabase.ts` - Unchanged.

## Task List

### Task 1: Repository Inspection and Behavior Verification
**Brief:** Inspect the repository to confirm current implementations and verify the actual refetch behavior before making changes.

**Steps:**
1. Read the approved specification completely.
2. Inspect the current implementations of:
   - `src/App.tsx`
   - `src/main.tsx`
   - `src/engines/curriculum/index.ts`
   - `src/lib/supabase.ts`
   - `src/pages/Home.tsx`
   - `src/pages/Progress.tsx`
   - `src/pages/Paths.tsx`
   - `src/pages/PathDetail.tsx`
   - `src/pages/ChallengeDetail.tsx`
   - `src/pages/Lesson.tsx`
   - authentication/provider components
   - routing configuration
3. Search the entire repository for:
   - `listPathsTree(`
   - `devora-curriculum-cache`
   - curriculum cache invalidation
   - direct Supabase curriculum queries
   - any code that clears sessionStorage
   - any code that causes providers to remount.
4. Verify the actual refetch behavior:
   - Determine whether navigation actually causes a Supabase curriculum network request.
   - Check if `listPathsTree()` returns from memory/sessionStorage.
   - Determine if stale-while-revalidate is responsible for observed requests.
   - Check for other code paths that perform the request.
   - Check if provider/auth/router remount causes the request.
   - Check for differences between development and production builds.
5. Document the finding briefly in the implementation notes/plan.

**Expected:** A clear understanding of the current data-fetch lifecycle and confirmed root cause of unnecessary requests.

### Task 2: Create Curriculum Context and Provider
**Brief:** Create `src/providers/CurriculumProvider.tsx` that implements the centralized curriculum state.

**Steps:**
1. Create the file `src/providers/CurriculumProvider.tsx`.
2. Define a React Context (`CurriculumContext`) with the shape:
   ```typescript
   interface CurriculumContextType {
     data: PathTree[] | null;
     status: 'loading' | 'ready' | 'error';
     error: Error | null;
   }
   ```
3. Implement a provider component (`CurriculumProvider`) that:
   - Uses `useState` to manage `data`, `status`, and `error`.
   - Uses `useRef` to track the current fetch promise for deduplication.
   - On initial load or when cache is invalid, calls `listPathsTree()` from the curriculum engine.
   - Implements request deduplication: if a request is already in flight, subsequent callers return the same promise.
   - Updates the state with the fetched data or error.
   - Preserves the existing sessionStorage cache (`devora-curriculum-cache`) for persistence across reloads.
   - Does not expose unnecessary invalidation functions unless required by existing application behavior (to be determined).
4. Export the context and the provider component.

**Expected:** A new file `src/providers/CurriculumProvider.tsx` that provides centralized curriculum data.

### Task 3: Integrate Provider into App
**Brief:** Modify `src/App.tsx` to wrap the application with `CurriculumProvider`.

**Steps:**
1. Import `CurriculumProvider` from `./providers/CurriculumProvider`.
2. Wrap the `<App />` component (or the appropriate part of the component tree) with `<CurriculumProvider>`.
   - Ensure it is placed above the lazy-loaded routes (`<Routes>`) and inside `AuthProvider` and `ThemeProvider` (as per the spec).
3. Verify that the provider does not cause unnecessary remounts during authentication changes.

**Expected:** `src/App.tsx` updated to provide curriculum context to the entire app.

### Task 4: Update Home Page to Consume Context
**Brief:** Modify `src/pages/Home.tsx` to use the curriculum context instead of fetching directly.

**Steps:**
1. Import `useContext` from React and `CurriculumContext` from `../providers/CurriculumProvider`.
2. Remove the local state (`data`, `status`, `attempt`) and the `loadCurriculum` function.
3. Replace the `useEffect` that called `loadCurriculum` with context consumption:
   ```typescript
   const { data, status, error } = useContext(CurriculumContext);
   ```
4. Adapt the rendering logic to use `data` from context (instead of the local `data` state).
   - The `loadCurriculum` function previously set local state; now we rely on context.
   - The `attempt` state for retry logic may need to be reconsidered. Since we are centralizing, we might remove the retry mechanism from the page and handle errors at the provider level. However, the spec says to preserve existing UI behavior. We can keep a retry mechanism at the page level that triggers a refetch in the provider (if we expose a refetch function) or we can rely on the provider's state. Let's check the existing retry logic in Home.tsx.
   - Looking at the existing Home.tsx, there is an `attempt` state and a retry function that re-runs the effect. We might want to keep a similar mechanism but at the provider level. However, to minimize changes, we can keep the retry logic in the page but instead of setting local state, we call a refetch method on the context (if we expose one). Alternatively, we can let the provider handle errors and retry via its own mechanism (e.g., refetch on stale cache). Since the spec does not require changing the invalidation rules, we can keep the provider's invalidation as is (only on stale cache or explicit invalidation). The retry button in the UI might then be less useful. We need to check if the application relies on the retry button for error recovery.
   - Let's inspect the existing Home.tsx more closely to understand the retry logic.
5. Preserve existing UI behavior: loading states, error states, and empty states.
6. Ensure that the page-specific logic (like `useProgress`, `firstUnfinishedLesson`, etc.) still works with the curriculum data from context.

**Expected:** `src/pages/Home.tsx` no longer calls `listPathsTree()` directly and instead consumes the curriculum context.

### Task 5: Update Progress Page to Consume Context
**Brief:** Modify `src/pages/Progress.tsx` to use the curriculum context.

**Steps:**
1. Similar to Home: import context, remove direct fetching, use context data.
2. The `loadProgressData` function in Progress.tsx calls `listPathsTree()` and then processes the tree to create progress data. We will need to adapt this to use the context data.
3. Since the context provides the raw curriculum tree, we can compute the progress data from it (same as before) but without making a new request.
4. Remove the `useEffect` that called `loadProgressData` and replace it with a computation that runs when the context data changes.
5. Preserve existing UI behavior.

**Expected:** `src/pages/Progress.tsx` no longer calls `listPathsTree()` directly.

### Task 6: Update Paths Page to Consume Context
**Brief:** Modify `src/pages/Paths.tsx` to use the curriculum context.

**Steps:**
1. Similar to above: import context, remove direct `listPathsTree()` call, use context data.
2. The `Paths` page currently calls `listPathsTree()` and sets local state. We'll replace that with context consumption.
3. Preserve existing UI behavior.

**Expected:** `src/pages/Paths.tsx` no longer calls `listPathsTree()` directly.

### Task 7: Update PathDetail Page to Consume Context
**Brief:** Modify `src/pages/PathDetail.tsx` to use the curriculum context.

**Steps:**
1. Similar to above: import context, remove direct `listPathsTree()` call, use context data.
2. The `loadPathDetail` function in PathDetail.tsx calls `listPathsTree()` and then processes the tree. We'll adapt to use context data.
3. Preserve existing UI behavior.

**Expected:** `src/pages/PathDetail.tsx` no longer calls `listPathsTree()` directly.

### Task 8: Update ChallengeDetail and Lesson Pages (if applicable)
**Brief:** Check if `src/pages/ChallengeDetail.tsx` and `src/pages/Lesson.tsx` use curriculum data and update them if necessary.

**Steps:**
1. Search for `listPathsTree` in these files.
2. If found, apply the same context consumption pattern.
3. If not found, no changes needed.

**Expected:** Any remaining direct curriculum fetching is replaced with context consumption.

### Task 9: Preserve Existing Curriculum Engine
**Brief:** Ensure `src/engines/curriculum/index.ts` is not unnecessarily changed.

**Steps:**
1. Verify that the provider uses `listPathsTree()` from this module.
2. Do not modify the caching logic unless the inspection in Task 1 reveals a need for correction (e.g., cache being cleared incorrectly).
3. If no correction is needed, leave the file unchanged.

**Expected:** `src/engines/curriculum/index.ts` remains as is, preserving its existing responsibilities.

### Task 10: Implement Request Deduplication
**Brief:** Ensure the provider prevents duplicate requests when multiple components request data simultaneously.

**Steps:**
1. In `CurriculumProvider`, use a `useRef` to store the current fetch promise.
2. When a request is needed, check if there is an in-flight promise; if so, return it.
3. Only call `listPathsTree()` if there is no in-flight promise.
4. This should work even in React Strict Mode (which may invoke effects twice in development).

**Expected:** No duplicate network requests for curriculum data, even when multiple components request data at the same time.

### Task 11: Preserve SPA State
**Brief:** Verify that curriculum state survives ordinary SPA navigation.

**Steps:**
1. The provider is placed above the routes, so it does not unmount/remount on navigation.
2. Confirm that the context value is preserved when navigating between pages that consume it.
3. Test scenarios: Home → Progress → Home and Home → Paths → PathDetail → Paths → Home.

**Expected:** Curriculum data remains in memory and is not refetched during SPA navigation.

### Task 12: Preserve Cache Semantics
**Brief:** Ensure the existing sessionStorage cache is used appropriately.

**Steps:**
1. The provider should read from and write to `sessionStorage` using the existing key `devora-curriculum-cache`.
2. Respect the 30-second TTL for stale cache and background refetch (if that is the current behavior).
3. Do not change the cache semantics unless the inspection in Task 1 reveals a need.
4. Do not use localStorage as a primary solution.

**Expected:** The sessionStorage cache continues to work as before, surviving page reloads and tab restoration.

### Task 13: Authentication Lifecycle Check
**Brief:** Inspect `AuthProvider` to ensure curriculum state does not leak across auth changes and that unnecessary refetches are avoided.

**Steps:**
1. Examine `src/lib/auth.tsx` (or wherever `AuthProvider` is defined).
2. Ensure that the `CurriculumProvider` is placed inside `AuthProvider` (or vice versa) so that curriculum state is reset when the user logs out/logs in (if curriculum data is user-dependent).
   - However, the curriculum data (paths, courses, etc.) is likely public and not user-dependent. We need to check if the curriculum data is the same for all users.
   - If the curriculum data is public, then we should not refetch it on auth changes unless the data is actually user-specific (e.g., if it includes user progress). The curriculum tree from `listPathsTree()` does not include user progress; progress is stored separately.
   - Therefore, we can keep the curriculum provider outside of the auth provider (or inside but not reset on auth changes) to avoid unnecessary refetches.
   - Let's check the spec: it says "If curriculum data is user-dependent, invalidate/reload it appropriately when the authenticated identity changes. If curriculum data is public/shared, do not unnecessarily refetch it solely because unrelated auth state changes."
   - We need to determine if the curriculum data is user-dependent. From the function `listPathsTree()`, it fetches learning paths, courses, modules, lessons, exercises. This seems to be public curriculum data.
   - However, the application also has user-specific data like progress, which is stored in Supabase but not part of the curriculum tree.
   - Therefore, we will not refetch curriculum data on auth changes unless we find that the curriculum data includes user-specific fields (which it does not from the current implementation).
3. Ensure that the `AuthProvider` does not cause the `CurriculumProvider` to remount unnecessarily.

**Expected:** Curriculum data is not refetched due to auth changes unless it is actually user-dependent (which we determine it is not).

### Task 14: Add Tests for the Provider
**Brief:** Write focused tests for `CurriculumProvider` to verify the new behavior.

**Steps:**
1. Create a test file `src/providers/CurriculumProvider.test.tsx`.
2. Test scenarios:
   - Initial curriculum loading (should call `listPathsTree` once).
   - Fresh cache reuse (should not call `listPathsTree` again).
   - Stale-cache behavior (should call `listPathsTree` for background refetch).
   - Request deduplication (multiple simultaneous requests should result in only one network request).
   - Error handling (if `listPathsTree` fails, context should show error).
   - Loading states.
3. Use mocking for the curriculum engine (`src/engines/curriculum/index.ts`) to control the behavior of `listPathsTree`.

**Expected:** Tests pass and cover the provider's core functionality.

### Task 15: Run Existing Tests and Type Checking
**Brief:** Ensure that the changes do not break existing tests and that type checking passes.

**Steps:**
1. Run `npm run test:units` to execute unit tests.
2. Run `npm run typecheck` to run TypeScript compilation.
3. Fix any issues that arise.

**Expected:** All existing tests pass and type checking shows no new errors.

### Task 16: Production Build and Preview
**Brief:** Verify that the production build works and that the preview behaves correctly.

**Steps:**
1. Run `npm run build` to create the production build.
2. Run `npm run preview` to test the production build locally.
3. Check for any errors in the build or preview.

**Expected:** The production build succeeds and the preview works without curriculum-related errors.

### Task 17: Critical Manual Verification
**Brief:** Manually verify the key scenarios to ensure the implementation meets the acceptance criteria.

**Steps:**
1. Scenario A — Initial load:
   - Open the application from a fresh browser state.
   - Verify that curriculum loads successfully and there are no duplicate simultaneous curriculum requests.
2. Scenario B — SPA navigation:
   - Navigate: "Home → Progress → Home" and verify zero new curriculum Supabase requests caused by navigation.
   - Navigate: "Home → Paths → PathDetail → Paths → Home" and verify the same.
3. Scenario C — Hard reload:
   - Reload the browser.
   - Verify that the React application initializes again and that valid sessionStorage curriculum cache may be reused (if not expired).
4. Scenario D — Stale cache:
   - Allow the existing cache TTL to expire (wait >30 seconds or manipulate timestamp).
   - Verify that behavior matches the existing stale-while-revalidate contract: cached data is used immediately and a background refetch is triggered.
   - Verify that the UI remains usable if cached data is available and that background refresh does not create duplicate requests.
5. Scenario E — Authentication:
   - Test sign-in/sign-out/auth initialization behavior.
   - Verify that no stale user-specific data leaks and that no unnecessary repeated curriculum requests are caused purely by provider remounting.

**Expected:** All scenarios pass as described in the acceptance criteria.

### Task 18: Final Review and Cleanup
**Brief:** Review the changes, ensure no unnecessary modifications, and prepare for final verification.

**Steps:**
1. Review the diff of all changes to ensure they align with the plan and spec.
2. Ensure that no unrelated features were modified.
3. Ensure that the UI was not redesigned unnecessarily.
4. Ensure that no new state-management libraries were introduced.
5. Ensure that Supabase security was not weakened and no service-role key was exposed.
6. Commit the changes.

**Expected:** A clean implementation that meets all requirements.

## Global Constraints
- Do not redesign the application.
- Do not rewrite the curriculum engine unnecessarily.
- Do not introduce a new state-management library.
- Do not use localStorage as the primary solution.
- Do not weaken Supabase security.
- Do not expose a service-role key.
- Do not change unrelated features.
- Do not modify the UI unnecessarily.
- Do not remove useful existing caching.
- Do not blindly refetch on route changes.

## Interfaces
- `CurriculumProvider` provides `{ data, status, error }` to consumers.
- Consumers (pages) now receive curriculum data via context instead of calling `listPathsTree()`.
- The provider uses the existing `listPathsTree()` function from `src/engines/curriculum/index.ts`.

## Success Criteria (from Spec)
- SPA Navigation: Home → Progress → Home does not cause a new curriculum Supabase network request.
- Browser Reload: Application reinitializes correctly; cached curriculum data may be reused if valid.
- Request Deduplication: Multiple components requesting curriculum data simultaneously do not create duplicate network requests.
- Invalidation: Curriculum mutations or explicit invalidations trigger appropriate refetches.
- Authentication: Auth state changes do not leak curriculum data between users.
- Vercel: Deployed application behaves identically to local production build.
- Existing Tests: All unit and integration tests continue to pass.
- Build Success: `npm run build` completes without errors.
