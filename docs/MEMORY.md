# Project Memory and Operational Notes

## 1. Project context

This repository was created as a lab control and equipment management system. It blends a polished admin dashboard with a backend foundation meant to power real operational workflows in academic labs.

## 2. Key implementation decisions

### Frontend-first prototype
The visual interface was prioritized early to demonstrate a realistic administration console. This gives the project a strong product feel before the backend logic is fully expanded.

### Spring Boot foundation
The backend was structured to be simple, modular, and extensible. Controllers are separated from domain logic, which makes it easier to grow features without major rewrites.

### Local development compatibility
The project originally referenced PostgreSQL and Java 21. In this environment, Java 17 and H2 were used to keep the app runnable without external system dependencies.

## 3. Local startup notes

- frontend runs on `http://localhost:3000`
- backend runs on `http://localhost:8080`
- backend health endpoint is available at `http://localhost:8080/api/health`
- local database is H2 in memory and is configured in `backend/src/main/resources/application.properties`
- the schema is generated from `backend/src/main/resources/schema.sql`

## 4. Important caveats

- this is not production-hardened yet
- authentication is not implemented yet
- no production database profile is configured yet
- the dashboard is visually rich, but data integration should be connected to real API flows before full use

## 5. Known technical notes

### Why H2 is used locally
H2 allows development continuity without requiring a local PostgreSQL engine. This is intentionally a safe default for study, demos, and rapid iteration.

### Why the database schema was adjusted
The original PostgreSQL-specific TIMESTAMPTZ fields were not recognized by H2. The schema was adapted for H2 compatibility while preserving the logical intent of the original design.

## 6. Recommended future memory entries

Add notes here for:

- key sprint decisions
- changes in product requirements
- new environment setup instructions
- infrastructure or deployment notes
- feature notes for future contributors

## 7. Contribution principle

When the project evolves, this memory file should remain the place for practical decisions and operational context, while the docs folder holds the formal product and architecture guidance.
