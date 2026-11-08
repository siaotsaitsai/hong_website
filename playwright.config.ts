import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  workers: 2,
  use: {baseURL: 'http://127.0.0.1:4322', headless: true, launchOptions: {executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']}},
  webServer: [
    {command: 'python3 -m http.server 4322 --bind 127.0.0.1 --directory web/dist', url: 'http://127.0.0.1:4322', reuseExistingServer: !process.env.CI},
    {command: 'vite --config tests/easy/vite.config.ts',url:'http://127.0.0.1:3333/tests/easy/',reuseExistingServer:!process.env.CI},
  ],
});
