import { homeHref } from '../lib/router'

export function NotFound() {
    return (
        <article>
            {/* Was href="#/", which useRoutedLinks skips because it starts with a
                hash — so this link stopped working when routing moved to real paths. */}
            <a href={homeHref} className="link-nav">
                ← back
            </a>
            <h1 className="t-name mt-7">Not found</h1>
            <p className="t-body mt-4">That page doesn't exist.</p>
        </article>
    )
}
