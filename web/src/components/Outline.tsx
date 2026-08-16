import type { MouseEvent } from 'react'
import type { NavItem } from './TopBar'

function jump(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Sits in the dead gutter to the left of the measure and says where you are.
 * Hidden below 1280px, where that gutter does not exist and the topbar carries
 * the same links instead — so this is never the only way to reach a section.
 */
export function Outline({ items, active }: { items: NavItem[]; active?: string }) {
    return (
        <nav className="outline" aria-label="On this page">
            <ol className="outline-list">
                {items.map((item) => (
                    <li key={item.id}>
                        <a
                            href={`#${item.id}`}
                            className={
                                item.id === active
                                    ? 'outline-link outline-on'
                                    : 'outline-link'
                            }
                            aria-current={item.id === active ? 'true' : undefined}
                            onClick={(event) => jump(event, item.id)}
                        >
                            {item.label}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    )
}
