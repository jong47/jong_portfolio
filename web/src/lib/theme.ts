import { useCallback, useEffect, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function isTheme(value: unknown): value is Theme {
    return value === 'system' || value === 'light' || value === 'dark'
}

export function readStoredTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return isTheme(stored) ? stored : 'system'
    } catch {
        return 'system'
    }
}

function persistTheme(theme: Theme): void {
    try {
        if (theme === 'system') localStorage.removeItem(STORAGE_KEY)
        else localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
}

export function resolveTheme(theme: Theme): ResolvedTheme {
    if (theme !== 'system') return theme
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function nextTheme(theme: Theme): ResolvedTheme {
    return resolveTheme(theme) === 'dark' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme): void {
    const resolved = resolveTheme(theme)
    document.documentElement.classList.toggle('dark', resolved === 'dark')

    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', resolved === 'dark' ? '#0c0c0b' : '#fbfbfa')
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(readStoredTheme)
    const [resolved, setResolved] = useState<ResolvedTheme>(() =>
        resolveTheme(readStoredTheme()),
    )

    useEffect(() => {
        applyTheme(theme)
        setResolved(resolveTheme(theme))

        if (theme !== 'system') return
        const query = window.matchMedia(DARK_QUERY)
        const onChange = () => {
            applyTheme('system')
            setResolved(resolveTheme('system'))
        }
        query.addEventListener('change', onChange)
        return () => query.removeEventListener('change', onChange)
    }, [theme])

    const toggle = useCallback(() => {
        setTheme((current) => {
            const next = nextTheme(current)
            persistTheme(next)
            return next
        })
    }, [])

    return { theme, resolved, toggle }
}
