import { useEffect, useState } from 'react'

const DETAIL_ROUTE = /^\/(systems|projects)\/([\w-]+)$/

export type DetailKind = 'systems' | 'projects'

export type Detail = {
    kind: DetailKind
    id: string
}

export function detailHref(kind: DetailKind, id: string) {
    return `#/${kind}/${id}`
}

export function detailFromRoute(route: string): Detail | null {
    const match = DETAIL_ROUTE.exec(route)
    return match ? { kind: match[1] as DetailKind, id: match[2] } : null
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
