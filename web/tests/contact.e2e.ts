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
        await expect(page.locator('#projects .timeline')).toBeVisible()
    })

    test('a project opens its own page and goes back to the list', async ({ page }) => {
        await page.goto(`${APP_URL}/#/projects`, { waitUntil: 'networkidle' })

        await page.click('.tl-title:has-text("OpenTelemetry")')
        await expect(page.locator('.article')).toBeVisible()

        await page.click('.topbar-link:has-text("back")')
        await expect(page).toHaveURL(/#\/projects$/)
        await expect(page.locator('#projects .timeline')).toBeVisible()
    })

    test('an unknown project id does not blank the page', async ({ page }) => {
        await page.goto(`${APP_URL}/#/projects/nope`, { waitUntil: 'networkidle' })
        await expect(page.getByText(/doesn't exist/i)).toBeVisible()
    })
})

test.describe('ordering', () => {
    test('the timeline runs newest first and labels each year once', async ({ page }) => {
        await page.goto(`${APP_URL}/#/projects`, { waitUntil: 'networkidle' })

        const labels = (await page.locator('.tl-year').allTextContents())
            .map((text) => text.trim())
            .filter(Boolean)

        expect(labels.length).toBeGreaterThan(1)
        expect(labels).toEqual([...new Set(labels)])

        const years = labels.map(Number)
        expect(years).toEqual([...years].sort((a, b) => b - a))
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
