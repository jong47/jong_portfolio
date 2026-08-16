import type { System } from '../data/types'
import { Diagram } from './Diagram'
import { TagRow } from './TagRow'

export function SystemPage({ system }: { system: System }) {
    return (
        <article>
            <h1 className="t-name">{system.title}</h1>
            <p className="t-meta mt-2">
                {system.meta} · {system.period}
            </p>
            <p className="t-body mt-6">{system.summary}</p>

            {system.metrics?.length ? (
                <ul className="metrics">
                    {system.metrics.map((metric) => (
                        <li key={metric} className="metric">
                            {metric}
                        </li>
                    ))}
                </ul>
            ) : null}

            {system.diagram ? <Diagram kind={system.diagram} /> : null}

            {system.sections?.map((section) => (
                <section key={section.heading} className="prose-block">
                    <h2 className="t-section">{section.heading}</h2>
                    <p className="entry-detail mt-2">{section.body}</p>
                </section>
            ))}

            {system.stack?.length ? <TagRow items={system.stack} /> : null}
        </article>
    )
}
