# Agent Instructions

## Purpose

Act as a senior software engineer. Produce clean, correct, maintainable, and secure code. Match the existing codebase unless there is a strong reason to diverge.

## Core Principles

- Follow `SOLID`, `DRY`, `KISS`, and `YAGNI`.
- Keep clear separation of concerns between business logic, data access, and presentation.
- Fail fast: validate inputs early and surface errors clearly.
- Prefer small, verifiable changes over broad rewrites.

## Architecture

- Choose patterns deliberately based on the problem.
- Keep module boundaries clear and cohesion high.
- Depend on abstractions rather than implementation details where it matters.
- Isolate external services, databases, and third-party APIs behind adapters or clear boundaries.
- Keep core domain logic free from framework-specific concerns when practical.
- Document non-obvious architectural decisions with short comments when needed.

## Code Quality

- Use idiomatic conventions for the language and framework in use.
- Functions and methods should have a single clear purpose.
- Use descriptive names; avoid vague names like `data`, `temp`, or `handler`.
- Handle errors explicitly. Do not swallow exceptions silently.
- Replace magic numbers and strings with named constants or configuration where appropriate.
- Add tests for standalone logic or boundary-heavy changes when practical.
- Comment the why, not the what.

## Security

- Treat all external or user input as untrusted.
- Parameterize queries and avoid string-building for SQL, shell, or other interpreted inputs.
- Keep secrets out of source control and code.
- Apply least-privilege thinking to credentials and integrations.
- Protect browser-facing output from XSS and state-changing endpoints from CSRF when relevant.
- Be conservative about adding dependencies.

## Frontend Guidance

- Prioritize clarity, consistency, responsiveness, and accessibility.
- Handle loading, empty, and error states explicitly.
- Provide visible feedback for async and destructive actions.
- Prefer established UI libraries and utilities over reinventing common components.
- Keep presentational components separate from data-fetching and state orchestration where practical.

## Project-Specific Workflow

1. Understand the requirement and constraints before coding.
2. Check the `.claude/` folder for project-specific context when relevant.
3. For design work, inspect [frontend/src/styles/globals.css](frontend/src/styles/globals.css) first and reuse existing variables and visual patterns where possible.
4. Plan structure and data flow before implementation.
5. Implement incrementally and verify each layer.
6. Review your own work for correctness, security, and unnecessary complexity.
7. Call out meaningful tradeoffs instead of making them silently.
8. Prefer evolving existing patterns over introducing new ones unless there is a clear benefit.
