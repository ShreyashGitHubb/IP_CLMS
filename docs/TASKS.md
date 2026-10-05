# Project Tasks and Delivery Plan

## 1. Current project status

The repository currently contains:

- a dark dashboard UI prototype
- a working Spring Boot backend skeleton
- equipment and user domain models
- JPA persistence setup
- local in-memory database compatibility for easy startup
- a strong documentation foundation

## 2. Completed work

### Frontend
- dashboard shell and route navigation
- equipment listing screen with search and add modal
- requests, transactions, maintenance, students, calendar, reports, and settings views
- dark admin console styling consistent across the app

### Backend
- Spring Boot application bootstrapping
- application configuration and schema initialisation
- health endpoint
- equipment CRUD controller and service
- user listing API
- transaction listing and creation support
- exception handling for validation and not-found scenarios

### Documentation
- product requirements document
- architecture guide
- engineering rules
- design system notes
- delivery task list

## 3. Planned work

### Immediate next tasks
1. connect the frontend to live backend data for equipment and users
2. add filters and sorting for inventory screens
3. implement request approval workflow and state transitions
4. create maintenance issue creation and update flows
5. add persistent product-level data for sample records

### Near-term tasks
- implement authentication and role-based access
- add user profile and session management
- improve reporting visuals and export options
- formalize transaction return flow for overdue items
- create API integration tests for core endpoints

### Long-term roadmap
- production PostgreSQL deployment profile
- analytics dashboard and trend reporting
- audit log reporting and exports
- multi-lab support and role-based lab visibility
- student portal and self-service request submission

## 4. Task tracking structure

Use the following status labels:

- `Backlog`
- `In Progress`
- `Blocked`
- `In Review`
- `Done`

## 5. Recommended backlog items

### Product backlog
- design student request UX
- create due date reminder notifications
- improve equipment history tracking
- support search by asset tag and category
- build lab utilization insights

### Engineering backlog
- build authentication layer
- add production config profile
- secure backend secrets and environment variables
- add frontend data-fetching services and hooks
- implement pagination and API filtering

### QA backlog
- verify frontend flows on desktop and mobile
- test validation and duplicate-record handling
- test CRUD endpoints under realistic data
- check dashboard summary values against raw data

## 6. Delivery priorities

Priority order for the next milestones:

1. working frontend-backend integration
2. request and transaction workflows
3. maintenance and records management
4. auth and role security
5. deployment and production hardening

## 7. Milestone targets

### Milestone 1: Working prototype
- dashboard loads
- backend responds to health and CRUD endpoints
- local setup works for a developer machine

### Milestone 2: Operational workflow
- requests can be approved and tracked
- due dates and transactions are visible
- maintenance tasks are created and updated

### Milestone 3: Institutional readiness
- auth and roles enabled
- production DB profile ready
- reporting and auditing are stable
