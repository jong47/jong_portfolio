import { useEffect, useState } from 'react'

const DETAIL_ROUTE = /^\/(systems|projects)\/([\w-]+)\/?$/
const PROJECTS_ROUTE = /^\/projects\/?$/
const HOME_ROUTE = /^\/?$/

/** Anything with a file extension is a real asset on disk, not a route. */
const ASSET = /\.[a-z0-9]+$/i

/** pushState fires no event of its own, so navigate() raises one for the app. */
const NAVIGATED = 'app:navigated'

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
    | { view: 'missing' }

export const homeHref = '/'
export const projectsHref = '/projects'

export function detailHref(kind: DetailKind, id: string) {
    return `/${kind}/${id}`
}

export function parseRoute(path: string): Route {
    const detail = DETAIL_ROUTE.exec(path)
    if (detail) {
        return {
            view: 'detail',
            detail: { kind: detail[1] as DetailKind, id: detail[2] },
        }
    }

    if (PROJECTS_ROUTE.test(path)) return { view: 'projects' }

    // Real hosting answers every path with index.html, so an unknown one has to be
    // refused here or it would silently render the home page.
    return HOME_ROUTE.test(path) ? { view: 'home' } : { view: 'missing' }
}

export function navigate(href: string) {
    if (href === window.location.pathname) return
    window.history.pushState(null, '', href)
    window.dispatchEvent(new Event(NAVIGATED))
}

export function useRoute() {
    const [path, setPath] = useState(() => window.location.pathname)

    useEffect(() => {
        // A push starts a new page, so it goes to the top. Back and forward do not:
        // the browser restores the previous scroll position and should be left to.
        function onPush() {
            setPath(window.location.pathname)
            window.scrollTo(0, 0)
        }

        function onPop() {
            setPath(window.location.pathname)
        }

        window.addEventListener(NAVIGATED, onPush)
        window.addEventListener('popstate', onPop)
        return () => {
            window.removeEventListener(NAVIGATED, onPush)
            window.removeEventListener('popstate', onPop)
        }
    }, [])

    return path
}

/**
 * One delegated listener instead of a Link component, so every plain `<a href="/…">`
 * already in the tree routes without being rewritten. Anything that is not an
 * ordinary left-click on an in-app path is left to the browser.
 */
export function useRoutedLinks() {
    useEffect(() => {
        function onClick(event: MouseEvent) {
            if (event.defaultPrevented || event.button !== 0) return
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

            const anchor = (event.target as Element | null)?.closest('a')
            if (!anchor) return

            const href = anchor.getAttribute('href')
            if (!href || href.startsWith('#')) return
            if (anchor.target && anchor.target !== '_self') return
            if (anchor.hasAttribute('download')) return
            if (anchor.origin !== window.location.origin) return
            if (ASSET.test(anchor.pathname)) return

            event.preventDefault()
            navigate(anchor.pathname)
        }

        document.addEventListener('click', onClick)
        return () => document.removeEventListener('click', onClick)
    }, [])
}
