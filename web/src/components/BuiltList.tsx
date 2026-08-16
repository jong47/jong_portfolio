import type { System } from '../data/types'
import { detailHref } from '../lib/router'
import { Catalogue } from './Catalogue'

export function BuiltList({ systems }: { systems: System[] }) {
    return (
        <Catalogue
            label="Systems built"
            items={systems.map((system) => ({
                id: system.id,
                title: system.title,
                summary: system.summary,
                href: detailHref('systems', system.id),
            }))}
        />
    )
}
