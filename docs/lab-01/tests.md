# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | passed |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | passed |
| 3 | Vitest | Heading renders | passed |
| 4 | Vitest | Success state shows Online + category list | passed |
| 5 | Vitest | Error state shows Offline + message | passed |

Paste your passing terminal output / screenshot below.

## Backend Test Output
```
> toktickit-server@1.0.0 test
> vitest run


 RUN  v2.1.9 /Users/DBsNICE/toktickit/server

 ✓ tests/lab-01/categories.test.ts (1) 578ms
 ✓ tests/lab-01/health.test.ts (1)

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  14:26:09
   Duration  1.94s (transform 111ms, setup 0ms, collect 1.15s, tests 718ms, environment 1ms, prepare 305ms)
```

## Frontend Test Output

> toktickit-client@1.0.0 test
> vitest run

```
 RUN  v2.1.9 /Users/DBsNICE/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3)
   ✓ App (3)
     ✓ renders the TokTickIT heading
     ✓ shows Online and the seeded categories on success
     ✓ shows an Offline error message when the API is unavailable

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  14:27:06
   Duration  3.29s (transform 156ms, setup 504ms, collect 331ms, tests 125ms, environment 1.44s, prepare 225ms)
```