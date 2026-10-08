# Curriculum Data Centralization Design

## 1. Current Data-Fetch Lifecycle

### 1.1. Curriculum Fetching Function
- The `listPathsTree()` function in `src/engines/curriculum/index.ts` is responsible for fetching the entire curriculum tree (paths, courses, modules, lessons, exercises) from Supabase.
- It uses a two-layer caching mechanism:
  1. **sessionStorage**: Key `devora-curriculum-cache` stores a payload `{ savedAt: number, tree: PathTree[] }` with a 30-second revalidation window.
  2. **in-memory Map caches**: Hydrated from sessionStorage data to support `getLesson()`, `getExercise()`, etc. without further network requests.

### 1.2. Component-Level Data Fetching
- Pages that require curriculum data (Home, Progress, Paths, PathDetail, etc.) each call `listPathsTree()` in their data-loading functions.
- These calls are triggered by `useEffect` hooks that run on component mount (and on specific dependency changes like `attempt` state or `pathId` params).
- Example from `src/pages/Home.tsx`:
  ```typescript
  useEffect(() => {
    // ... loading logic
    loadCurriculum() // calls listPathsTree()
  }, [attempt])
  ```

### 1.3. Current Behavior on Navigation
- When navigating between pages:
  1. The current page component unmounts.
  2. The new page component mounts.
  3. Its `useEffect` runs, calling `listPathsTree()` again.
- If the sessionStorage cache is fresh (<30s old), `listPathsTree()` returns the cached data immediately without a network request.
- If the cache is stale (≥30s old), `listPathsTree()` returns the cached data immediately and triggers a background refetch to update the cache.
- If no cache exists, a network request is made.

### 1.4. Observed Issue
- Users report seeing Supabase network requests on every navigation, even when navigating quickly (<30s apart).
- This suggests either:
  a) The sessionStorage cache is not present or is being cleared between navigations.
  b) The background refetch (triggered on stale cache) is being perceived as a new request due to timing or network tab observation.
  c) There is an undiscovered code path that bypasses the cache or forces a refetch.

## 2. Confirmed Root Cause (To Be Verified)

### 2.1. Hypothesis
The primary cause of unnecessary network requests is the component-level fetching pattern:
- Each page independently calls `listPathsTree()` on mount.
- Even though the function returns cached data without a network request when the cache is fresh, the act of calling the function and hydrating the in-memory caches on every mount may be inefficient and could lead to perceived delays.
- However, the user's observation of actual network requests suggests the cache may not be functioning as expected in practice.

### 2.2. Verification Steps Needed
To establish the actual behavior, we must:
1. Confirm whether `listPathsTree()` is making network requests on every navigation or returning from cache.
2. Check if the sessionStorage key `devora-curriculum-cache` is present and valid between navigations.
3. Determine if the cache is being cleared or invalidated by any code.
4. Observe whether the perceived requests are actual network requests or background refetches.

## 3. New Centralized Data Lifecycle

### 3.1. Centralized Curriculum State
- Introduce a React Context (`CurriculumContext`) that holds:
  - `data`: The curriculum tree (`PathTree[]`) or `null` if loading.
  - `status`: `'loading' | 'ready' | 'error'`.
  - `error`: Error object if status is `'error'`.
- The context is initialized at the app root (in `src/App.tsx` or a new `src/providers/CurriculumProvider.tsx`).

### 3.2. Data Fetching Logic
- The context provider implements the data fetching logic:
  - On initial load or when cache is invalid, call `listPathsTree()` to fetch curriculum data.
  - Use the existing sessionStorage cache to avoid unnecessary network requests.
  - Implement request deduplication: if a request is already in flight, subsequent callers reuse the same promise.
  - Update the context state with the fetched data or error.
- The provider exposes a stable reference to the curriculum data and loading state.

### 3.3. Component Consumption
- Pages that previously called `listPathsTree()` now consume the curriculum context:
  - Use `useContext(CurriculumContext)` to access `data` and `status`.
  - Replace direct calls to `listPathsTree()` with context consumption.
  - Retain existing loading/error UI patterns but driven by context state.

### 3.4. Cache Persistence
- Preserve the existing sessionStorage cache (`devora-curriculum-cache`) to survive:
  - Page reloads (full browser refresh).
  - Tab/window closure and restoration (within the same browsing context).
- The in-memory React state is the primary source for SPA navigation; sessionStorage acts as a persistent backup.

### 3.5. Request Deduplication
- Implement a promise-based deduplication mechanism in the context provider:
  - Track the current fetch promise.
  - If `listPathsTree()` is called while a request is in flight, return the in-flight promise.
  - Prevent duplicate network requests when multiple components request data simultaneously.

### 3.6. Invalidation Rules
- Curriculum data is refetched only when:
  1. The sessionStorage cache is stale (>30 seconds old).
  2. An explicit invalidation is triggered (e.g., curriculum mutation via user action).
  3. Authentication state changes and the existing data is no longer valid (to be evaluated).
- No refetching occurs solely due to SPA navigation or component remount.

## 4. Provider/Store Ownership

### 4.1. Context Location
- The `CurriculumContext` provider will be placed in `src/providers/CurriculumProvider.tsx`.
- It will wrap the application in `src/App.tsx` (inside `AuthProvider` and `ThemeProvider` to ensure authentication is resolved first).

### 4.2. State Management
- Use React hooks (`useState`, `useEffect`, `useRef`) to manage:
  - Curriculum data state.
  - Loading status.
  - Fetch promise for deduplication.
- Avoid external state-management libraries (e.g., Redux, Pinia) to minimize dependencies.

## 5. Cache Semantics

### 5.1. sessionStorage
- Key: `devora-curriculum-cache`
- Payload: `{ savedAt: number, tree: PathTree[] }`
- TTL: 30 seconds (configurable via constant).
- Survives:
  - Page reloads (F5/Ctrl+R).
  - Tab/window restoration (within same browsing session).
- Does NOT survive:
  - Browser closure (sessionStorage is cleared when the tab/window is permanently closed).
  - Incognito/private browsing sessions (if not persisted).

### 5.2. In-Memory State
- Held in React context state.
- Lifetime: Same as the SPA session (until page reload).
- Primary mechanism for preventing refetches during navigation.

## 6. Vercel Production Considerations

### 6.1. Environment Variables
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`) are correctly set in the Vercel project settings.
- Verify that these variables are prefixed with `VITE_` so they are exposed to the Vite build.

### 6.2. Production Build
- The existing `vercel.json` configuration uses `@vercel/static-build` with `npm run build` → `dist/` output.
- Confirm that the production build does not alter the behavior of the curriculum caching mechanism.
- Check that the sessionStorage API is available in the production browser environment (it is).

### 6.3. Authentication and RLS
- Ensure that Supabase authentication works correctly in production:
  - Auth callback URLs are configured in the Supabase project.
  - JWT handling is consistent between local and production.
- Do not modify RLS policies; rely on existing row-level security.

### 6.4. Lazy-Loaded Routes
- Verify that lazy-loaded routes (via `React.lazy` and `Suspense`) do not cause the curriculum context to remount or lose state.
- The context provider is placed above the lazy-loaded routes in the component tree.

## 7. Files/Components Affected

### 7.1. New Files
- `src/providers/CurriculumProvider.tsx` – Implements the curriculum context and provider.

### 7.2. Modified Files
- `src/App.tsx` – Wrap the application with `CurriculumProvider`.
- `src/pages/Home.tsx` – Replace `loadCurriculum()` and local state with context consumption.
- `src/pages/Progress.tsx` – Replace `loadProgressData()` with context consumption.
- `src/pages/Paths.tsx` – Replace direct `listPathsTree()` call with context consumption.
- `src/pages/PathDetail.tsx` – Replace direct `listPathsTree()` call with context consumption.
- `src/pages/ChallengeDetail.tsx` – (if applicable) Replace any curriculum fetching.
- `src/pages/Lesson.tsx` – (if applicable) Replace any curriculum fetching.
- `src/pages/Playground.tsx` – (if no curriculum data needed, no change).
- `src/pages/Profile.tsx` – (if no curriculum data needed, no change).
- `src/lib/supabase.ts` – No changes needed (retain existing `getSupabase()`).

### 7.3. Unchanged Files
- `src/engines/curriculum/index.ts` – Retain existing caching logic; the context provider will use this function.
- All other engines (progress, project, execution, learning) – No changes unless they directly call `listPathsTree()` (they currently do not).

## 8. Verification Strategy

### 8.1. Unit Tests
- Write tests for `CurriculumProvider` to verify:
  - Data is fetched on initial load.
  - Cached data is reused on subsequent calls without network requests.
  - Request deduplication prevents multiple simultaneous requests.
  - Stale cache triggers background refetch.
  - Error handling and loading states.

### 8.2. Integration Tests
- Simulate navigation between pages and verify:
  - No network requests are made for curriculum data when cache is fresh.
  - Curriculum data remains consistent across route changes.
  - Background refetch updates the cache without disrupting UI.

### 8.3. Manual Verification
- Use browser devtools to:
  1. Check sessionStorage for `devora-curriculum-cache` before and after navigation.
  2. Monitor network tab for Supabase requests during navigation.
  3. Confirm that curriculum data persists in React DevTools context across route changes.
- Test scenarios:
  - Initial load: one curriculum network request.
  - Home → Progress → Home: zero curriculum network requests.
  - Hard reload: one curriculum network request (if cache expired) or zero (if cache fresh).
  - Cache staleness: verify background refetch after 30 seconds.

### 8.4. Production Verification
- Check Vercel deployment logs for any curriculum-related errors.
- Verify environment variables are set correctly in Vercel.
- Test the deployed application with the same navigation scenarios as local.

## 9. Success Criteria

- **SPA Navigation**: Home → Progress → Home does not cause a new curriculum Supabase network request.
- **Browser Reload**: Application reinitializes correctly; cached curriculum data may be reused if valid.
- **Request Deduplication**: Multiple components requesting curriculum data simultaneously do not create duplicate network requests.
- **Invalidation**: Curriculum mutations or explicit invalidations trigger appropriate refetches.
- **Authentication**: Auth state changes do not leak curriculum data between users.
- **Vercel**: Deployed application behaves identically to local production build.
- **Existing Tests**: All unit and integration tests continue to pass.
- **Build Success**: `npm run build` completes without errors.
