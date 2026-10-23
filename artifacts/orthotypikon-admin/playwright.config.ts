import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4178/',
    browserName: 'chromium',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH ?? '/repl/tools/bin/chromium',
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: 'PORT=4178 BASE_PATH=/ pnpm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4178/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
