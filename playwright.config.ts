import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', workers: 1, use: { baseURL: 'http://localhost:3000', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ['--no-sandbox'] } }, webServer: { command: 'npm start', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 30000 } });
