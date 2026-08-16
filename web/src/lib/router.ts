import { useEffect, useState } from 'react'

const DETAIL_ROUTE = /^\/(systems|projects)\/([\w-]+)$/
const PROJECTS_ROUTE = /^\/projects\/?$/

export type DetailKind = 'systems' | 'projects'

export type Detail = {
    kind: DetailKind
    id: string
}

/** Detail is matched before the list route, so /projects/<id> never reads as /projects. */
export type Route =
    | { view: 'home' }
    | { view: 'projects' }
    | { view: 'detail'; detail: Detail }

export const projectsHref = '#/projects'

export function detailHref(kind: DetailKind, id: string) {
    return `#/${kind}/${id}`
}

export function parseRoute(route: string): Route {
    const detail = DETAIL_ROUTE.exec(route)
    if (detail) {
        return {
            view: 'detail',
            detail: { kind: detail[1] as DetailKind, id: detail[2] },
        }
    }

    return PROJECTS_ROUTE.test(route) ? { view: 'projects' } : { view: 'home' }
}

export function useHashRoute() {
    const [route, setRoute] = useState(() => window.location.hash.slice(1))

    useEffect(() => {
        function onHashChange() {
            setRoute(window.location.hash.slice(1))
            window.scrollTo(0, 0)
        }

        window.addEventListener('hashchange', onHashChange)
        return () => window.removeEventListener('hashchange', onHashChange)
    }, [])

    return route
}
