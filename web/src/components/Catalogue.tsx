export type CatalogueItem = {
    id: string
    title: string
    summary: string
    meta?: string
    href: string
}

type Props = {
    items: CatalogueItem[]
    label?: string
}

export function Catalogue({ items, label }: Props) {
    if (items.length === 0) return null

    return (
        <div className="cat">
            {label ? <p className="cat-label">{label}</p> : null}
            <ol className="cat-list">
                {items.map((item, index) => (
                    <li key={item.id}>
                        <a className="cat-link" href={item.href}>
                            <span className="cat-index">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="cat-title">{item.title}</span>
                            <span className="cat-mark" aria-hidden="true">
                                →
                            </span>
                            {item.meta ? (
                                <span className="cat-meta">{item.meta}</span>
                            ) : null}
                            <span className="cat-summary">{item.summary}</span>
                        </a>
                    </li>
                ))}
            </ol>
        </div>
    )
}
