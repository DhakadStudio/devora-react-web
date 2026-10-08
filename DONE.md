Curriculum data centralization completed successfully.

Summary of work:
- Created CurriculumContext and CurriculumProvider to centralize data fetching.
- Integrated provider into App.jsx, wrapping the application.
- Updated Home, Progress, Paths, PathDetail, Landing, and Profile pages to consume context instead of calling listPathsTree directly.
- Verified no remaining direct calls to listPathsTree in pages.
- All relevant tests pass (except pre-existing known failures).

The application now avoids unnecessary curriculum data refetching during SPA navigation.