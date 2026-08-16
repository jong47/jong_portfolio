import type { ReactNode } from 'react'

type Props = {
    id?: string
    title: string
    hint?: ReactNode
    children: ReactNode
}

export function Section({ id, title, hint, children }: Props) {
    return (
        <section id={id} className="section">
            <div className="section-head">
                <h2 className="t-section">{title}</h2>
                {hint ? <span className="t-meta">{hint}</span> : null}
            </div>
            {children}
        </section>
    )
}
