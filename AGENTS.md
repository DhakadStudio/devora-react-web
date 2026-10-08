# AGENTS.md - Professional Engineering Guidelines for OpenCode Agent

## GENERAL

- Never guess about the architecture.
- Inspect the existing code before making changes.
- Search for existing implementations before creating new ones.
- Reuse existing abstractions when appropriate.
- Do not rewrite working code without evidence.
- Keep changes minimal and focused.
- Do not introduce dependencies without justification.

## DATABASE

- Never create migrations based on assumptions.
- Inspect the actual schema and relationships first.
- Verify foreign keys before constructing nested queries.
- Analyze actual query plans before claiming an index will improve performance.
- Treat RLS as a security boundary.
- Never weaken RLS merely to make a query work.
- Prefer documented/current Supabase patterns.
- Validate migrations before applying them.

## PERFORMANCE

- Measure before optimizing.
- Identify the actual bottleneck first.
- Separate browser, network, API, database, build, and deployment latency.
- Do not claim a performance improvement without evidence.
- Avoid premature optimization.
- Prefer measurable improvements.

## SECURITY

- Never expose secrets.
- Never commit .env files or private credentials.
- Never expose service-role credentials to browser code.
- Review authentication and authorization boundaries.
- Review RLS policies when database access changes.
- Treat user-controlled input as untrusted.
- Perform a security review for sensitive changes.

## VERCEL

- Inspect the actual deployed application before changing deployment configuration.
- Verify the correct Vercel project/root directory.
- Do not assume the repository's main application is the deployed application.
- Check build configuration and framework detection.
- Check environment variables without exposing their values.
- Investigate deployment/runtime logs before proposing fixes.
- Optimize based on measurements rather than assumptions.

## GIT

- Never blindly commit unrelated changes.
- Show changed files before committing.
- Never delete or overwrite user work without explicit justification.
- Keep commits logically focused.
- Do not push unless explicitly requested.

## TESTING

- Prefer tests before implementation when appropriate.
- Run the relevant tests after changes.
- Run type checking and linting when available.
- Verify production builds when deployment-related changes are made.
- Never report success when verification was not actually performed.

## AGENT BEHAVIOR

Before implementing a non-trivial task:

1. Understand the repository.
2. Identify the actual architecture.
3. Identify relevant existing code.
4. Identify constraints and risks.
5. Form a plan.
6. Implement incrementally.
7. Test.
8. Review the diff.
9. Verify the result.
10. Report exactly what was changed and what was verified.

When uncertain:

- investigate first;
- use official documentation;
- inspect the actual system;
- do not invent facts.

For Supabase tasks, prefer current official Supabase documentation and the installed Supabase skills.

For Vercel tasks, prefer current official Vercel documentation and the installed Vercel skills.

For framework/library behavior, verify against current official documentation when the behavior may have changed.
