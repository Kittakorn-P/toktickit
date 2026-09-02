import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./lab-02",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Starts both dev servers automatically before tests run, and reuses
  // them if already running (so you don't have to start them manually).
  webServer: [
    {
      command: "npm run dev",
      cwd: "../server",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "npm run dev",
      cwd: "../client",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});