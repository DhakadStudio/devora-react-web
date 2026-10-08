# Curriculum Data Centralization Completed

All pages now consume curriculum context via CurriculumProvider, eliminating unnecessary listPathsTree calls during SPA navigation.

## Changes
- Created `src/providers/CurriculumProvider.tsx` with context and provider.
- Wrapped application with `CurriculumProvider` in `src/App.tsx`.
- Updated `Home.tsx`, `Progress.tsx`, `Paths.tsx`, `PathDetail.tsx`, `Landing.tsx`, `Profile.tsx` to use context.
- Removed all direct `listPathsTree()` calls from pages.
- Preserved existing sessionStorage caching and UI behavior.

## Verification
- No remaining `listPathsTree` calls in `src/pages`.
- All relevant unit tests pass (except pre-existing known failures).
- Application ready for Vercel production deployment.

See CURRICULUM_DATA_CENTRALIZATION_SUMMARY.md for full details.