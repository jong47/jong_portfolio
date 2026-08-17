import type { ReactNode } from 'react'
import type { Entry as EntryData } from '../data/types'
import { Anchor } from './Anchor'
import { TagRow } from './TagRow'

type Props = {
    entry: EntryData
    extra?: ReactNode
}

export function Entry({ entry, extra }: Props) {
    return (
        <li className="entry">
            <div className="entry-head">
                <h3 className="entry-title">{entry.title}</h3>
                <p className="entry-period">{entry.period}</p>
            </div>

            {entry.meta ? <p className="entry-meta">{entry.meta}</p> : null}

            {entry.detail ? <p className="entry-detail">{entry.detail}</p> : null}

            {entry.bullets?.length ? (
                <ul className="entry-bullets">
                    {entry.bullets.map((bullet) => (
                        <li key={bullet} className="entry-bullet">
                            {bullet}
                        </li>
                    ))}
                </ul>
            ) : null}

            {extra}

            {entry.stack?.length ? <TagRow items={entry.stack} /> : null}

            {entry.links?.length ? (
                <ul className="detail-links">
                    {entry.links.map((link) => (
                        <li key={link.href}>
                            <Anchor link={link} className="link t-mono" />
                        </li>
                    ))}
                </ul>
            ) : null}
        </li>
    )
}
