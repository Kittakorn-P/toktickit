# TokTickIT

TokTickIT is an IT service desk application built for CPE 334 Lab 1, demonstrating a full-stack vertical slice: React + Vite (frontend) → Express (backend) → Prisma + PostgreSQL (database).

## Tech Stack
- Frontend: React, TypeScript, Vite, Bootstrap
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL, Prisma ORM
- Testing: Vitest, Supertest

## Setup Instructions

### Prerequisites
- Node.js and npm installed
- PostgreSQL installed and running

### 1. Clone the repository
git clone https://github.com/Kittakorn-P/toktickit.git
cd toktickit

### 2. Backend setup
cd server
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
Backend runs on http://localhost:3000

### 3. Frontend setup
(in a new terminal)
cd client
npm install
npm run dev
Frontend runs on http://localhost:5173

### 4. Running tests
cd server && npm run test
cd client && npm run test