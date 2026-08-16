import { expect, test, type Page } from '@playwright/test'
import { APP_URL } from '../playwright.config'

const INBOX = 'gradyjonathan55@gmail.com'
const LINKS = 'nav[aria-label="Profile links"]'

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
        expect(html).not.toContain(INBOX)
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
