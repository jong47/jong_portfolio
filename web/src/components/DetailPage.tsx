import type { Entry } from '../data/types'
import { Anchor } from './Anchor'
import { TagRow } from './TagRow'

type Props = {
    entry: Entry & { summary: string; article?: string }
    /** What the entry is, in the reader's words — "open source contribution", "system". */
    kind: string
}

const WORDS_PER_MINUTE = 200

function readingTime(html: string) {
    const words = html
        .replace(/<[^>]+>/g, ' ')
        .trim()
        .split(/\s+/).length
    return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`
}

/**
 * The one layout for /projects/* and /systems/*, following the shape of a long-form
 * article page: context line, title, deck, links, read time, then the prose. Links
 * sit above the body rather than under it, so a reader can judge whether the piece is
 * relevant before spending the scroll on it.
 */
export function DetailPage({ entry, kind }: Props) {
    const context = [kind, entry.meta].filter(Boolean).join(' · ')
    const byline = [entry.article && readingTime(entry.article), entry.period]
        .filter(Boolean)
        .join(' · ')

    return (
        <article>
            <p className="t-meta">{context}</p>
            <h1 className="t-name mt-2">{entry.title}</h1>
            <p className="t-deck">{entry.summary}</p>

            {entry.links?.length ? (
                <ul className="detail-links">
                    {entry.links.map((link) => (
                        <li key={link.href}>
                            <Anchor link={link} className="link t-mono" />
                        </li>
                    ))}
                </ul>
            ) : null}

            <p className="t-meta mt-5">{byline}</p>

            {entry.stack?.length ? <TagRow items={entry.stack} /> : null}

            {entry.metrics?.length ? (
                <ul className="metrics">
                    {entry.metrics.map((metric) => (
                        <li key={metric} className="metric">
                            {metric}
                        </li>
                    ))}
                </ul>
            ) : null}

            {entry.article ? (
                <div
                    className="article"
                    // Compiled at build time from markdown in this repository. No
                    // visitor input reaches it, which is what makes this safe.
                    dangerouslySetInnerHTML={{ __html: entry.article }}
                />
            ) : entry.detail ? (
                <p className="t-body mt-10">{entry.detail}</p>
            ) : null}
        </article>
    )
}
