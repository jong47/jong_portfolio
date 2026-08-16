import type { MouseEvent } from 'react'
import { ThemeToggle } from './ThemeToggle'

export type NavItem = {
    id: string
    label: string
}

function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function TopBar({ items, active }: { items: NavItem[]; active?: string }) {
    return (
        <div className="topbar">
            <div className="topbar-inner">
                <nav className="topbar-nav" aria-label="Sections">
                    {items.map((item) => (
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
                <ThemeToggle />
            </div>
        </div>
    )
}

export function DetailBar() {
    return (
        <div className="topbar">
            <div className="topbar-inner">
                <a href="#/" className="topbar-link">
                    ← back
                </a>
                <ThemeToggle />
            </div>
        </div>
    )
}
