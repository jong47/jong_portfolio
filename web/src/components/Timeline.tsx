import type { Project } from '../data/types'
import { detailHref } from '../lib/router'

const KIND_LABEL: Record<Project['kind'], string> = {
    oss: 'open source',
    research: 'research',
    personal: 'personal',
}

/** The displayed year, which is also what the list is already sorted by. */
function year(period: string) {
    const years = period.match(/\d{4}/g)
    return years ? String(Math.max(...years.map(Number))) : period
}

export function Timeline({ items }: { items: Project[] }) {
    let previous = ''

    return (
        <ol className="timeline">
            {items.map((item) => {
                const current = year(item.period)
                const starts = current !== previous
                previous = current

                return (
                    <li key={item.id} className="tl-item">
                        {/* Only the first entry of a run is labelled, so a year reads as a
                            heading for everything beneath it rather than repeating. */}
                        <p className={starts ? 'tl-year' : 'tl-year tl-year-quiet'}>
                            {starts ? current : ''}
                        </p>

                        <div className="tl-body">
                            <div className="tl-head">
                                <a
                                    className="tl-title"
                                    href={detailHref('projects', item.id)}
                                >
                                    {item.title}
                                </a>
                                <span className="tl-kind">{KIND_LABEL[item.kind]}</span>
                            </div>

                            {item.meta ? <p className="tl-meta">{item.meta}</p> : null}
                            <p className="tl-summary">{item.summary}</p>

                            {item.stack ? (
                                <p className="tl-stack">{item.stack.join(' · ')}</p>
                            ) : null}
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}
