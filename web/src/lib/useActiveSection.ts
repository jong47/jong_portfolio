import { useEffect, useState } from 'react'

export function useActiveSection(ids: readonly string[]) {
    const [active, setActive] = useState(ids[0])

    useEffect(() => {
        const seen = new Map<string, boolean>()

        function update() {
            const bottom =
                window.innerHeight + Math.ceil(window.scrollY) >=
                document.documentElement.scrollHeight - 2

            if (bottom) {
                setActive(ids[ids.length - 1])
                return
            }

            const first = ids.find((id) => seen.get(id))
            if (first) setActive(first)
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    seen.set(entry.target.id, entry.isIntersecting)
                }
                update()
            },
            { rootMargin: '-25% 0px -65% 0px' },
        )

        for (const id of ids) {
            const element = document.getElementById(id)
            if (element) observer.observe(element)
        }

        window.addEventListener('scroll', update, { passive: true })
        return () => {
            observer.disconnect()
            window.removeEventListener('scroll', update)
        }
    }, [ids])

    return active
}
