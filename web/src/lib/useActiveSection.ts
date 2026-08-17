import { useEffect, useState } from 'react'

/** Where in the viewport a heading counts as the one being read. */
const LINE = 0.3

/**
 * Reads position on every scroll rather than observing intersections. Article
 * headings are ~30px tall, so a band an observer could watch is thin enough for
 * a fast scroll to jump clean over — which left four of seven sections in a case
 * study permanently unreachable. Measuring the last heading above the line
 * cannot skip one.
 *
 * `enabled` is a dependency, not just a guard: routing unmounts the sections, so
 * the listener has to be re-attached rather than kept across a visit.
 */
export function useActiveSection(ids: readonly string[], enabled = true) {
    const [active, setActive] = useState(ids[0])

    useEffect(() => {
        if (!enabled) return

        function update() {
            const bottom =
                window.innerHeight + Math.ceil(window.scrollY) >=
                document.documentElement.scrollHeight - 2

            if (bottom) {
                setActive(ids[ids.length - 1])
                return
            }

            const line = window.innerHeight * LINE
            let current = ids[0]
            for (const id of ids) {
                const element = document.getElementById(id)
                if (element && element.getBoundingClientRect().top <= line) current = id
            }
            setActive(current)
        }

        update()
        window.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
        }
    }, [ids, enabled])

    return active
}
