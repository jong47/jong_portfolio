import { expect, test, type Page } from '@playwright/test'
import { APP_URL } from '../playwright.config'

const LINKS = 'nav[aria-label="Profile links"]'

/** Any address at all, rather than one specific one — naming the real inbox in a
 *  public repo would leak the exact thing this test asserts the page never shows. */
const ANY_ADDRESS = /[\w.+-]+@[\w-]+\.[\w.]+/

const DRAFT = {
    name: 'Dana',
    email: 'dana@example.com',
    message: 'Are you free to talk next week?',
}

/** Stands in for the deployed api, and records what the page sent it. */
async function stubApi(page: Page, { status = 204 } = {}) {
    const seen: { route: string; body: Record<string, string> }[] = []

    await page.route('http://localhost:8000/**', async (route) => {
        const { pathname } = new URL(route.request().url())
        seen.push({
            route: pathname,
            body: route.request().postDataJSON() as Record<string, string>,
        })

        await route.fulfill(
            status === 204 ? { status: 204 } : { status, json: { detail: 'nope' } },
        )
    })

    return seen
}

async function fill(page: Page) {
    await page.click(`${LINKS} button:has-text("contact")`)
    await page.fill('.dialog input[type="text"], .dialog input:not([type])', DRAFT.name)
    await page.fill('.dialog input[type="email"]', DRAFT.email)
    await page.fill('.dialog textarea', DRAFT.message)
}

test.describe('contact form', () => {
    test('the address is nowhere in the page', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        const html = await page.content()
        expect(html).not.toContain('mailto:')
        expect(html).not.toMatch(ANY_ADDRESS)
    })

    test('contact is a button, the rest are plain links', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })
        await expect(page.locator(`${LINKS} button`)).toHaveText(['contact'])
        await expect(page.locator(`${LINKS} a`)).toHaveText([
            'github',
            'linkedin',
            'resume',
        ])
    })

    test('the resume is a static asset opened in a new tab', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        const resume = page.locator(`${LINKS} a:has-text("resume")`)
        await expect(resume).toHaveAttribute('href', '/Jonathan_Ong_Resume.pdf')
        await expect(resume).toHaveAttribute('target', '_blank')
        await expect(resume).toHaveAttribute('rel', /noopener/)

        const head = await page.request.get(`${APP_URL}/Jonathan_Ong_Resume.pdf`)
        expect(head.status()).toBe(200)
        expect(head.headers()['content-type']).toContain('pdf')
    })

    test('the dialog opens, traps escape, and closes', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        await expect(page.locator('.dialog')).toBeHidden()
        await page.click(`${LINKS} button:has-text("contact")`)

        const dialog = page.locator('.dialog')
        await expect(dialog).toBeVisible()
        await expect(dialog).toHaveAttribute('aria-modal', 'true')

        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()
    })

    test('a message is sent and the dialog closes', async ({ page }) => {
        const seen = await stubApi(page)
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        await fill(page)
        await page.click('.dialog-send')

        await expect(page.locator('.toast')).toHaveText('message sent')
        await expect(page.locator('.dialog')).toBeHidden()

        expect(seen).toHaveLength(1)
        expect(seen[0].route).toBe('/contact')
        expect(seen[0].body).toMatchObject(DRAFT)
        expect(seen[0].body).not.toHaveProperty('token')
    })

    test('an empty form never reaches the api', async ({ page }) => {
        const seen = await stubApi(page)
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        await page.click(`${LINKS} button:has-text("contact")`)
        await page.click('.dialog-send')

        await expect(page.locator('.dialog')).toBeVisible()
        expect(seen).toHaveLength(0)
    })

    test('an api outage keeps the draft and leaks nothing', async ({ page }) => {
        await stubApi(page, { status: 503 })
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        await fill(page)
        await page.click('.dialog-send')

        const error = page.locator('.field-error')
        await expect(error).toBeVisible()
        expect(await error.textContent()).not.toContain('@')

        await expect(page.locator('.dialog')).toBeVisible()
        await expect(page.locator('.dialog textarea')).toHaveValue(DRAFT.message)
    })

    test('the toast is announced to screen readers', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })
        await expect(page.locator('.toast-host')).toHaveAttribute('aria-live', 'polite')
    })
})

test.describe('routing', () => {
    test('projects live on their own route, not the landing page', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })
        await expect(page.locator('#projects')).toHaveCount(0)

        await page.click('.topbar-site a:has-text("projects")')
        await expect(page.locator('#projects .cat-list')).toBeVisible()
    })

    test('a project opens its own page and goes back to the list', async ({ page }) => {
        await page.goto(`${APP_URL}/projects`, { waitUntil: 'networkidle' })

        await page.click('.cat-title:has-text("OpenTelemetry")')
        await expect(page.locator('.article')).toBeVisible()

        await page.click('.topbar-link:has-text("back")')
        await expect(page).toHaveURL(/\/projects$/)
        await expect(page.locator('#projects .cat-list')).toBeVisible()
    })

    test('a deep link loads straight into the page', async ({ page }) => {
        await page.goto(`${APP_URL}/projects/portfolio`, { waitUntil: 'networkidle' })
        await expect(page.locator('.article')).toBeVisible()
        expect(new URL(page.url()).hash).toBe('')
    })

    test('back and forward move between pages', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        await page.click('.topbar-site a:has-text("projects")')
        await expect(page).toHaveURL(/\/projects$/)

        await page.goBack()
        await expect(page.locator('#work')).toBeVisible()

        await page.goForward()
        await expect(page.locator('#projects .cat-list')).toBeVisible()
    })

    test('an unknown path is refused rather than rendering home', async ({ page }) => {
        await page.goto(`${APP_URL}/not-a-page`, { waitUntil: 'networkidle' })
        await expect(page.getByText(/doesn't exist/i)).toBeVisible()
        await expect(page.locator('#work')).toHaveCount(0)
    })

    test('static assets and new-tab links are left to the browser', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        // The resume is a real file; routing it would swallow the download.
        const resume = page.locator(`${LINKS} a:has-text("resume")`)
        await expect(resume).toHaveAttribute('href', '/Jonathan_Ong_Resume.pdf')

        await resume.click()
        await page.waitForTimeout(300)

        // The whole risk: if the delegated handler routed this, the current tab
        // would be sitting on /Jonathan_Ong_Resume.pdf rendering the not-found
        // view. Headless Chromium downloads the PDF rather than navigating the
        // popup, so the popup's own URL is not worth asserting on.
        expect(page.url().replace(/\/$/, '')).toBe(APP_URL)
        await expect(page.locator('#work')).toBeVisible()
    })

    test('an unknown project id does not blank the page', async ({ page }) => {
        await page.goto(`${APP_URL}/projects/nope`, { waitUntil: 'networkidle' })
        await expect(page.getByText(/doesn't exist/i)).toBeVisible()
    })
})

test.describe('ordering', () => {
    test('projects run newest first and each states its kind', async ({ page }) => {
        await page.goto(`${APP_URL}/projects`, { waitUntil: 'networkidle' })

        const meta = await page.locator('#projects .cat-meta').allTextContents()
        expect(meta.length).toBeGreaterThan(1)

        const years = meta.map((line) =>
            Math.max(...(line.match(/\d{4}/g) ?? ['0']).map(Number)),
        )
        expect(years).toEqual([...years].sort((a, b) => b - a))

        // The kind rides on the same meta line rather than being a second label.
        for (const line of meta) {
            expect(line).toMatch(/open source contribution|research|personal project/)
        }
    })

    test('work runs newest first, current role on top', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        const periods = await page.locator('#work .entry-period').allTextContents()
        expect(periods.length).toBeGreaterThan(1)
        expect(periods[0]).toMatch(/present/i)
    })
})

test.describe('outline', () => {
    test('tracks the active section on a wide viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        const outline = page.locator('.outline')
        await expect(outline).toBeVisible()
        await expect(page.locator('.topbar-sections')).toBeHidden()

        await page.locator('.outline-link:has-text("certs")').click()
        await expect(page.locator('.outline-on')).toHaveText('certs')
    })

    test('keeps tracking after a round trip through another route', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        const activeAt = async (y: number) => {
            await page.evaluate((to) => window.scrollTo(0, to), y)
            await page.waitForTimeout(350)
            return page.locator('.outline-on').textContent()
        }

        // Routing unmounts the sections. An observer left attached to the old
        // nodes freezes on whatever was active when the page was left.
        await page.click('.topbar-site a:has-text("projects")')
        await expect(page.locator('.cat-list')).toBeVisible()
        await page.click('.topbar-site a:has-text("home")')
        await expect(page.locator('#work')).toBeVisible()

        expect(await activeAt(0)).toBe('about')
        expect(await activeAt(1200)).toBe('work')
    })

    test('gives way to the topbar links on a narrow viewport', async ({ page }) => {
        await page.setViewportSize({ width: 900, height: 800 })
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        await expect(page.locator('.outline')).toBeHidden()
        await expect(page.locator('.topbar-sections')).toBeVisible()
    })
})

test.describe('layout', () => {
    test('the dialog fits a phone without causing overflow', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 720 })
        await page.goto(APP_URL, { waitUntil: 'networkidle' })

        await page.click(`${LINKS} button:has-text("contact")`)
        await expect(page.locator('.dialog')).toBeVisible()

        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        )
        expect(overflow).toBe(false)
    })
})
