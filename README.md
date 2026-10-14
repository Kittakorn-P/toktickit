# TokTickIT

TokTickIT is an IT service desk application built for CPE 334. It is a full-stack
vertical slice: React + Vite (frontend) → Express (backend) → Prisma + PostgreSQL
(database).

- **Lab 1** delivered the scaffold (health check, seeded Categories).
- **Lab 2** added the Requester ticketing MVP: Create Ticket, My Tickets
  (search/filter/sort/pagination), Ticket Detail, and the Attachment lifecycle.
- **Lab 3** added real session-based login with three roles (Requester, IT Staff,
  Administrator), the IT Staff queue and ticket detail (claim, IT Priority, status),
  Public Comments and Internal Notes, and Administrator user management. This replaced
  Lab 2's temporary Development Requester selector.
- **Lab 4** completes the service-desk workflow:
  - **Actions Taken** on each ticket: IT Staff and Administrators create and edit them,
    Requesters see them read-only.
  - A **status-transition matrix** enforced by the backend, with stale-update (409)
    handling on action edits and status changes.
  - A Requester can mark a ticket **"appears resolved"** (advisory only) and **Reopen** a
    Resolved ticket; only IT Staff/Administrators can resolve or close.
  - **Role dashboards** (Requester, and IT Staff/Administrator) with metric cards that
    drill down into filtered ticket lists. Dashboard is now the landing page for every
    role.

The engineering contract for each sprint is in `docs/lab-0X/`.

## Tech Stack
- Frontend: React, TypeScript, Vite, React Router, Bootstrap
- Backend: Node.js, Express, TypeScript, express-session (cookie sessions), bcrypt,
  Multer (file uploads)
- Database: PostgreSQL, Prisma ORM
- Testing: Vitest, Supertest, React Testing Library (unit/API/component), Playwright
  (E2E and responsive/visual QA)

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

`migrate dev` applies every migration from Labs 1–4 in order and keeps existing data.

### 3. Frontend setup
(in a new terminal)
```bash
cd client
npm install
npm run dev
```
Frontend runs on http://localhost:5173

### 4. Log in
Open http://localhost:5173. You will land on the login page. The seed creates these
accounts, all with the local-dev-only initial password `ChangeMe123!`. Every account is
forced to choose a new password at first login.

| Role | Email |
|---|---|
| Requester | `jennifer.anderson@example.com`, `michael.brown@example.com`, `sarah.johnson@example.com`, `david.lee@example.com` |
| IT Staff | `priya.nair@tiktockit.com`, `carlos.mendez@tiktockit.com`, `wei.zhang@tiktockit.com` |
| Administrator | `admin@tiktockit.com` |

The seed also creates two inactive accounts (`inactive.ida@example.com`,
`inactive.ivan@tiktockit.com`) for testing deactivation, plus the Categories and Related
Systems.

> **About re-seeding:** `npx prisma db seed` is safe to run repeatedly, but it resets the
> Requester and IT Staff passwords back to `ChangeMe123!` (and forces a password change
> again), and it deletes and re-creates the seeded Actions Taken. The Administrator
> account is left as it is. The seed does not create tickets; create them through the app.

### 5. E2E and responsive/visual QA setup
(one-time; Playwright starts the backend and frontend itself if they are not running)
```bash
cd e2e
npm install
npx playwright install chromium
```
> Note: if `npx playwright install` fails with a "does not support chromium
> on mac1X" error, this is a known issue with newer Playwright releases on
> some macOS versions. Pin to an earlier version as a workaround:
> `npm install -D @playwright/test@1.48.0` then retry the install.

**E2E accounts must be prepared first.** The specs log in with fixed passwords, so each
account below must already have been through the first-login password change, set to
exactly this password. Redo this after every re-seed. (Local-dev test accounts only.)

| Account | Password the specs expect |
|---|---|
| `jennifer.anderson@example.com` | `Jennifer123!` |
| `michael.brown@example.com` | `Michael123!` |
| `priya.nair@tiktockit.com` | `Priya456!` |
| `admin@tiktockit.com` | `NewSecure123!` |

The specs also need at least one ticket to exist for the Staff queue specs, which pick
the first ticket in the queue. Create one as a Requester if the database is empty.

## Running Tests

### Backend (unit + API)
```bash
cd server && npm run test
```
(or `npx vitest run`; add a folder such as `tests/lab-04` to run one lab). The API tests
run against the database in `DATABASE_URL`, create their own users and tickets, and
clean up after themselves.

### Frontend (component/UI)
```bash
cd client && npm run test
```

### End-to-end and responsive/visual QA (Playwright)
```bash
cd e2e
npx playwright test              # every lab
npx playwright test lab-04       # one lab only
npx playwright test lab-04/responsive.spec.ts -g "Actions Taken panel.*desktop"   # one test
```
Responsive/visual QA screenshots (desktop 1280, tablet 820, mobile 375) are written to
`artifacts/lab-02/screenshots/`, `artifacts/lab-03/screenshots/`, and
`artifacts/lab-04/screenshots/`. Running the whole suite regenerates all three folders.

## Demo Walkthrough (Lab 4)
1. Log in as a Requester. You land on the **Dashboard**. Click **+ Create Ticket** and
   submit a ticket.
2. Open the ticket and click **Mark Problem as Resolved**. The status stays the same.
3. Log out, then log in as IT Staff. The dashboard shows queue counts; click **New** to
   see the filtered queue and open the ticket. A **"Requester indicates resolved"** badge
   is shown.
4. Click **Claim Ticket**, then **+ Add Action**: submit one without a Follow-up Note
   (with Follow-Up Required? checked) to see validation, then fill it in.
5. Use the status dropdown to move the ticket Open → In Progress → Resolved. It only
   offers the transitions allowed from the current status.
6. Log back in as the Requester: the ticket shows Resolved, the Actions Taken are
   visible read-only, and **Reopen Ticket** is available.

## Project Structure
```
client/      React frontend
server/      Express backend + Prisma schema, migrations, seed
e2e/         Playwright E2E and responsive/visual QA tests (lab-02, lab-03, lab-04)
docs/        Engineering contract per sprint (docs/lab-0X: specification, ui-spec,
             api-spec, tests; Lab 4 also has reviewer.md and ai-use.md)
artifacts/   Generated screenshots for visual QA evidence
```