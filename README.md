# CLMS — Lab Control Management System

CLMS is a lab operations dashboard for managing college laboratory equipment, request workflows, maintenance tracking, student activity, and operational reporting. The project combines a modern Next.js frontend with a Spring Boot API and a lightweight local database configuration so it can be run and extended quickly in a development environment.

## Project summary

This application is designed for administrators and lab staff who need to:

- track inventory across multiple equipment categories
- review and approve student equipment requests
- monitor active loans and due dates
- log maintenance incidents and service status
- keep a clear audit trail of lab activity
- review operational health and utilization through dashboards

The current UI includes a strong operational dashboard style with dark panels, compact status cards, and a lab-admin tooling layout that mirrors a real control center.

## Tech stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- UI styling: custom dark theme, lucide-react icons
- Backend: Spring Boot 3.4.x, Java 17, JPA / Hibernate
- Database: H2 in-memory for local development; PostgreSQL-ready schema
- Package manager: pnpm
- Build/test: Maven + pnpm

## Repository structure

```text
.
├── app/                     # Next.js app router pages and UI composition
├── backend/                # Spring Boot application source
│   ├── src/main/java/       # Java backend code
│   ├── src/main/resources/ # app config and SQL schema
│   └── src/test/java/      # backend tests
├── components/             # shared UI building blocks
├── lib/                    # utility functions
├── public/                 # static assets
├── docs/                   # product and engineering documentation
├── README.md               # project overview and quick start guide
├── package.json            # frontend scripts and dependencies
├── pnpm-lock.yaml          # pnpm lockfile
├── pnpm-workspace.yaml     # workspace config
├── tsconfig.json           # TypeScript config
├── next.config.mjs         # Next.js config
├── postcss.config.mjs      # PostCSS config
└── .gitignore              # repo ignore rules
```

## Core features

### Frontend dashboard
- lab operations summary cards
- latest activity feed
- equipment inventory overview
- maintenance and report navigation
- request workflow status tracking

### Backend API
- health endpoint for service validation
- equipment CRUD endpoints
- user listing API
- transaction API for equipment movement and due tracking
- common validation and error handling middleware

### Data model
- users
- equipment
- transactions
- logs

## Local setup

### 1) Install dependencies

Frontend:

```bash
pnpm install
```

Backend dependencies are handled by Maven on first run or test.

### 2) Start the backend

From the project root:

```bash
cd backend
/snap/intellij-idea/132/plugins/maven-plugin/lib/maven3/bin/mvn spring-boot:run
```

> The project uses a local H2 in-memory database configuration for development compatibility. This avoids needing a local PostgreSQL installation while still allowing the schema and JPA layer to run.

### 3) Start the frontend

From the project root:

```bash
pnpm exec next dev -H 0.0.0.0 -p 3000
```

Then open:

- http://localhost:3000
- backend health: http://localhost:8080/api/health

## Backend endpoints

The API is mapped under `/api`:

- `GET /api/health` — health status payload
- `GET /api/equipment` — list all equipment
- `GET /api/equipment/{id}` — retrieve equipment by ID
- `POST /api/equipment` — create new equipment
- `PUT /api/equipment/{id}` — update equipment
- `DELETE /api/equipment/{id}` — delete equipment
- `GET /api/users` — list users summary
- `GET /api/transactions` — list transactions
- `POST /api/transactions` — create transaction record

## Current status

The project is in a solid early-stage prototype phase with:

- a working dashboard UI
- a functional Spring Boot backend skeleton
- local development database support
- CRUD-ready service modules for inventory and user data
- documentation assets for planning and project governance

## Developer notes

This project is intentionally structured for rapid iteration. It follows a product-team style architecture with separate concern areas:

- product requirements in the docs folder
- UI and frontend logic in the app and components folders
- business logic and persistence in the backend package tree

## Recommended next steps

1. Connect the frontend dashboard cards to live backend data.
2. Build full request approval workflows.
3. Add transaction creation and return logic.
4. Add filtering, sorting, and pagination for equipment and users.
5. Add auth and role-based access control.
6. Prepare production configuration for PostgreSQL and deployment.

## Team and documentation conventions

Project documentation is stored in the `docs/` folder and should be used as the source of truth for:

- product decisions
- architecture choices
- design language
- implementation tasks
- operational memory

This repository is intentionally organized so that the product, engineering rules, and delivery plan remain readable and easy to extend.
