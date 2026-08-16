import { defineConfig } from '@playwright/test'

/** Never called — every test stubs this origin. It only has to be set, because
 *  `contactEnabled` is what keeps the send button from rendering disabled. */
const API = 'http://localhost:8000'

export const APP_URL = 'http://localhost:5174'

export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.e2e.ts',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        permissions: ['clipboard-read', 'clipboard-write'],
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'npx vp dev --port 5174',
        url: APP_URL,
        env: { VITE_CONTACT_API_URL: API },
        reuseExistingServer: !process.env.CI,
    },
})
