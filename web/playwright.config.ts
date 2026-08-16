import { defineConfig } from '@playwright/test'

/** Cloudflare dummy sitekeys. The app has no fallback, so tests set these explicitly. */
const ALWAYS_PASSES = '1x00000000000000000000AA'
const ALWAYS_FAILS = '2x00000000000000000000AB'

/** Never called — every test stubs this origin. It only has to be set. */
const API = 'http://localhost:8000'

export const PASS_URL = 'http://localhost:5174'
export const FAIL_URL = 'http://localhost:5199'

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
    webServer: [
        {
            command: 'npx vp dev --port 5174',
            url: PASS_URL,
            env: { VITE_TURNSTILE_SITE_KEY: ALWAYS_PASSES, VITE_CONTACT_API_URL: API },
            reuseExistingServer: !process.env.CI,
        },
        {
            command: `npx vp dev --port 5199`,
            url: FAIL_URL,
            env: { VITE_TURNSTILE_SITE_KEY: ALWAYS_FAILS, VITE_CONTACT_API_URL: API },
            reuseExistingServer: !process.env.CI,
        },
    ],
})
