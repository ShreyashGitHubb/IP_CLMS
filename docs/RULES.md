# Engineering Rules and Working Standards

## 1. Purpose

This document defines the working standards for the CLMS project so the codebase stays consistent, readable, and maintainable as it grows.

## 2. Core rules

### Keep responsibilities separated
- UI logic belongs in frontend components or app route files.
- business logic belongs in backend services.
- database persistence belongs in JPA entities and repositories.
- validation and error handling belong to controller advice and request validation.

### Prefer clarity over cleverness
- avoid obscure one-liners when a clear structure is easier to maintain
- prefer readable, explicit naming over short abbreviations
- keep functions focused and small

### Validate before completion
- run the relevant tests or startup checks before declaring work complete
- verify the app still boots after any backend compatibility change

## 3. Naming conventions

### Frontend
- React components use PascalCase
- utility functions use camelCase
- route names and folders stay descriptive and task-focused

### Backend
- Java classes use UpperCamelCase
- methods use camelCase
- repository interfaces use the Spring Data naming convention
- domain objects stay aligned with actual business concepts

## 4. Documentation rules

- update docs when significant product or architecture decisions change
- keep README and docs synchronized with real project behavior
- record local environment caveats where necessary

## 5. Database rules

- avoid introducing database-specific syntax that breaks local development setups
- prefer portable SQL patterns or a production-specific profile when needed
- keep schema definitions explicit and well-structured

## 6. API rules

- keep controller routes stable and meaningful
- return clear validation errors and consistent response payloads
- use `@CrossOrigin` only when necessary for local frontend access
- prefer explicit domain error handling over generic exceptions

## 7. UI rules

- maintain consistent spacing, typography, and status-color semantics
- keep operational views readable and dense enough for admin workflows
- ensure clickable controls have visible affordances and clear labels
- avoid introducing uncontrolled UI complexity without a user need

## 8. Change control

### Branching
- use feature branches for task-level work
- keep branches named clearly and descriptively

### Commit expectations
- commit in small, reviewable units
- include enough context in commit messages to explain the purpose of the change

### Release discipline
- keep the docs and runbook updated before release milestones
- validate the frontend and backend startup together before final QA

## 9. Local development rules

- use pnpm for frontend dependency management
- use Maven for backend compilation and tests
- prefer H2 for local dev unless a real PostgreSQL environment is required
- document environment differences when they affect developers

## 10. Quality checklist

Before finalizing a task, confirm:

- the code is readable and consistent with project patterns
- the relevant tests or startup commands were run
- the docs reflect the current state of the repository
- no unnecessary debug code or temporary setup remains

## 11. Future standards to add

The team should later formalize:

- authentication model and access roles
- API versioning strategy
- formal UI component governance
- data privacy and retention policies
- deployment and environment promotion pipeline
