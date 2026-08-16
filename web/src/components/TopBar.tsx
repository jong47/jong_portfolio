import type { MouseEvent } from 'react'
import { homeHref, projectsHref } from '../lib/router'
import { ThemeToggle } from './ThemeToggle'

export type NavItem = {
    id: string
    label: string
}

const SITE = [
    { href: homeHref, label: 'home' },
    { href: projectsHref, label: 'projects' },
]

function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function SiteNav({ current }: { current: 'home' | 'projects' }) {
    return (
        <nav className="topbar-site" aria-label="Pages">
            {SITE.map((page) => (
                <a
                    key={page.href}
                    href={page.href}
                    className={
                        page.label === current ? 'topbar-link topbar-on' : 'topbar-link'
                    }
                    aria-current={page.label === current ? 'page' : undefined}
                >
                    {page.label}
                </a>
            ))}
        </nav>
    )
}

/**
 * The section links are duplicated by Outline above 1280px, where CSS hides this
 * copy. Rendering both keeps the sections reachable at every width without a
 * width-dependent render, which would need a resize listener to stay correct.
 */
export function TopBar({
    current,
    sections,
    active,
}: {
    current: 'home' | 'projects'
    sections?: NavItem[]
    active?: string
}) {
    return (
        <div className="topbar">
            <div className="topbar-inner">
                <SiteNav current={current} />

                {sections ? (
                    <nav className="topbar-sections" aria-label="Sections">
                        {sections.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                className={
                                    item.id === active
                                        ? 'topbar-link topbar-on'
                                        : 'topbar-link'
                                }
                                aria-current={item.id === active ? 'true' : undefined}
                                onClick={(event) => scrollToSection(event, item.id)}
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>
                ) : null}

                <ThemeToggle />
            </div>
        </div>
    )
}

export function DetailBar({ backTo = homeHref }: { backTo?: string }) {
    return (
        <div className="topbar">
            <div className="topbar-inner">
                <a href={backTo} className="topbar-link">
                    ← back
                </a>
                <ThemeToggle />
            </div>
        </div>
    )
}
