# Product Requirements Document (PRD)

## 1. Overview

CLMS is a laboratory control and equipment management system for academic institutions. It provides a centralized digital tool for lab administrators to manage inventory, student borrowing workflows, equipment maintenance, and operational visibility.

The product aims to replace fragmented manual processes with a simple, modern, and auditable workflow for equipment handoff and catalog management.

## 2. Problem statement

Many educational labs still manage equipment through spreadsheets, paper records, and informal communication. This causes:

- poor inventory visibility
- missed due dates and delayed returns
- unclear accountability for equipment usage
- difficult maintenance tracking
- weak reporting for administrative decision-making

CLMS addresses these issues by providing a single interface for equipment lifecycle management.

## 3. Product goals

### Primary goals
- reduce equipment mismanagement
- improve visibility into active loans and assets
- simplify approval workflows for students and staff
- improve lab maintenance tracking
- create an auditable trail for all equipment usage

### Secondary goals
- enable faster onboarding for lab staff
- support future integration with reports and analytics
- provide a foundation for student-facing request flows

## 4. Users

### Admin / lab manager
- views all assets and their operational state
- approves or denies requests
- reviews due dates and outstanding loans
- tracks maintenance and service events

### Lab staff / technician
- logs equipment issues
- updates equipment records
- coordinates repairs and calibration schedules

### Students
- request equipment for coursework or projects
- check current loan status
- receive notifications about due dates or approvals

## 5. Functional requirements

### Inventory management
- add equipment records with category, asset tag, location, and description
- update equipment status such as available, maintenance, low stock, or borrowed
- search equipment by name or category
- view total inventory counts and summary metrics

### Request workflow
- student submits equipment requests
- admin reviews requests in a queue
- request status can be pending, approved, overdue, or closed
- request due date is visible to staff

### Transactions and loans
- log equipment issue and return events
- track users, timestamps, and item movement
- identify overdue and due-today equipment

### Maintenance
- record maintenance actions and service requests
- track incidents for equipment requiring repair
- categorize preventive or reactive maintenance

### Reporting and oversight
- display utilization metrics
- build insight views for active loans and inventory health
- export or summarize operational activity over time

## 6. Non-functional requirements

### Performance
- dashboard and list screens should feel responsive for small and medium datasets
- API requests should complete quickly under normal admin loads

### Reliability
- failed validation and duplicate records should yield clear feedback
- database errors should be explained in a user-friendly form

### Security
- access should be role-based in future versions
- password storage should use strong hashing
- endpoints should be protected against unauthorized access

### Accessibility
- screens should support keyboard use and readable contrast
- controls should have clear labels and readable state indicators

## 7. User journeys

### Admin inventory review
1. Admin opens dashboard.
2. Sees equipment counts, request queue, and maintenance alerts.
3. Opens equipment page.
4. Searches for a specific item or filters by status.
5. Updates item details or adds a new asset.

### Student equipment request
1. Student requests a device for a task.
2. Request enters a pending queue.
3. Admin approves the request.
4. Transaction record is created.
5. Student is notified on return due date.

## 8. Acceptance criteria

- Admin dashboard shows inventory, requests, and active loan information.
- Equipment can be created, searched, and filtered.
- Request records show clear status and due dates.
- Maintenance items can be reviewed and triaged.
- API responds with structured health and validation information.
- Application runs locally with minimal setup and is ready for extension.

## 9. Success metrics

- fewer missing or untracked equipment assets
- reduced time to review request queues
- better visibility of overdue items
- improved maintenance visibility for lab staff

## 10. Future roadmap

- authentication and authorization
- student portal experience
- multi-lab or multiple-site support
- analytics and export reports
- role-specific dashboards and notifications
