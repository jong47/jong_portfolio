import type { Project } from '../data/types'
import { Anchor } from './Anchor'
import { TagRow } from './TagRow'

export function ProjectPage({ project }: { project: Project }) {
    return (
        <article>
            {project.article ? (
                <>
                    <p className="t-meta">
                        {project.meta} · {project.period}
                    </p>
                    {/* Compiled from markdown at build time by the vite plugin, so
                        the only author of this HTML is the repository. */}
                    <div
                        className="article"
                        dangerouslySetInnerHTML={{ __html: project.article }}
                    />
                </>
            ) : (
                <>
                    <h1 className="t-name">{project.title}</h1>
                    <p className="t-meta mt-2">
                        {project.meta} · {project.period}
                    </p>
                    {project.detail ? (
                        <p className="t-body mt-6">{project.detail}</p>
                    ) : null}
                </>
            )}

            {project.link ? (
                <p className="mt-8">
                    <Anchor link={project.link} className="link t-mono" />
                </p>
            ) : null}

            {project.stack?.length ? <TagRow items={project.stack} /> : null}
        </article>
    )
}

export function DetailNotFound() {
    return (
        <article>
            <a href="#/" className="link-nav">
                ← back
            </a>
            <h1 className="t-name mt-7">Not found</h1>
            <p className="t-body mt-4">That page doesn't exist.</p>
        </article>
    )
}
