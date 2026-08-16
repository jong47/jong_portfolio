import type { Project } from '../data/types'
import { detailHref } from '../lib/router'
import { Catalogue } from './Catalogue'

const KIND_LABEL: Record<Project['kind'], string> = {
    oss: 'open source contribution',
    research: 'research',
    personal: 'personal project',
}

/**
 * The same catalogue Systems built uses. Projects only differ by carrying what
 * kind of work each one was, which is one more field in the meta line rather
 * than a second way of rendering a list.
 */
export function ProjectList({ items }: { items: Project[] }) {
    return (
        <Catalogue
            items={items.map((project) => ({
                id: project.id,
                title: project.title,
                summary: project.summary,
                meta: [KIND_LABEL[project.kind], project.meta, project.period]
                    .filter(Boolean)
                    .join(' · '),
                href: detailHref('projects', project.id),
            }))}
        />
    )
}
