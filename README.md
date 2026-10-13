# TokTickIT

TokTickIT is an IT service desk application built for CPE 334. It demonstrates
a full-stack vertical slice: React + Vite (frontend) → Express (backend) →
Prisma + PostgreSQL (database).

**Lab 1** delivered the initial scaffold (health check, seeded Categories).
**Lab 2** builds the Requester-facing ticketing MVP on top of it: a temporary
Development Requester selector (testing-only, not real authentication),
Create Ticket, My Tickets (search/filter/sort/pagination), Ticket Detail, and
a full Attachment lifecycle (upload, download, soft-remove). See
`docs/lab-02/specification.md` for the full engineering contract.

## Tech Stack
- Frontend: React, TypeScript, Vite, React Router, Bootstrap
- Backend: Node.js, Express, TypeScript, Multer (file uploads)
- Database: PostgreSQL, Prisma ORM
- Testing: Vitest, Supertest (unit/API/UI), Playwright (E2E and responsive/visual QA)

## Setup Instructions

### Prerequisites
- Node.js and npm installed
- PostgreSQL installed and running

### 1. Clone the repository
```bash
git clone https://github.com/Kittakorn-P/toktickit.git
cd toktickit
```

### 2. Backend setup
```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```
Backend runs on http://localhost:3000

### 3. Frontend setup
(in a new terminal)
```bash
cd client
npm install
npm run dev
```
Frontend runs on http://localhost:5173

Open http://localhost:5173 — you'll land on the Development Requester
Selection screen. Choose a seeded Requester to access Create Ticket,
My Tickets, and Ticket Detail.

### 4. E2E and responsive/visual QA setup
(one-time; requires both the backend and frontend dev servers available)
```bash
cd e2e
npm install
npx playwright install chromium
```
> Note: if `npx playwright install` fails with a "does not support chromium
> on mac1X" error, this is a known issue with newer Playwright releases on
> some macOS versions. Pin to an earlier version as a workaround:
> `npm install -D @playwright/test@1.48.0` then retry the install.

## Running Tests

### Backend (unit + API)
```bash
cd server && npm run test
```

### Frontend (component/UI)
```bash
cd client && npm run test
```

### End-to-end and responsive/visual QA (Playwright)
Automatically starts both dev servers if not already running.
```bash
cd e2e
npx playwright test
```
Responsive/visual QA screenshots are written to
`artifacts/lab-02/screenshots/`.

## Project Structure
```
client/    React frontend
server/    Express backend + Prisma schema/seed
e2e/       Playwright E2E and responsive/visual QA tests
docs/      Engineering contract docs (specification, api-spec, tests, ui-spec)
artifacts/ Generated screenshots for visual QA evidence
```