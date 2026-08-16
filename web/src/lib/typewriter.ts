import { useEffect, useState, type RefObject } from 'react'

const TYPE = 55
const ERASE = 26
const HOLD = 1700
const BLANK = 380

const REDUCED = '(prefers-reduced-motion: reduce)'

const jitter = (base: number, spread: number) => base + Math.random() * spread

function shuffled<T>(items: readonly T[], avoidFirst?: T): T[] {
    const next = [...items]
    for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[next[i], next[j]] = [next[j], next[i]]
    }
    if (next.length > 1 && next[0] === avoidFirst) [next[0], next[1]] = [next[1], next[0]]
    return next
}

export function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED).matches)

    useEffect(() => {
        const query = window.matchMedia(REDUCED)
        const sync = () => setReduced(query.matches)
        query.addEventListener('change', sync)
        return () => query.removeEventListener('change', sync)
    }, [])

    return reduced
}

/**
 * Writes straight to the node instead of through state — a typewriter is an
 * animation, not application data, and re-rendering React 20 times a second to
 * move one text node is work nobody asked for. The write is deferred to a frame
 * so it lands with the browser's layout pass rather than partway through one.
 */
export function useTypewriter(
    phrases: readonly string[],
    target: RefObject<HTMLElement | null>,
    enabled: boolean,
) {
    useEffect(() => {
        const node = target.current
        if (!enabled || !node) return

        let queue = shuffled(phrases)
        let index = 0
        let cut = 0
        let erasing = false
        let timer: ReturnType<typeof setTimeout>
        let frame = 0

        function step() {
            const phrase = queue[index]
            let wait: number

            if (!erasing && cut < phrase.length) {
                cut += 1
                wait = jitter(TYPE, 45)
            } else if (!erasing) {
                erasing = true
                wait = jitter(HOLD, 700)
            } else if (cut > 0) {
                cut -= 1
                wait = jitter(ERASE, 20)
            } else {
                erasing = false
                index += 1
                if (index === queue.length) {
                    // Reshuffle so the order never settles into a loop, and never
                    // repeats the phrase that just left the screen.
                    queue = shuffled(phrases, phrase)
                    index = 0
                }
                wait = jitter(BLANK, 200)
            }

            const text = phrase.slice(0, cut)
            frame = requestAnimationFrame(() => {
                if (target.current) target.current.textContent = text
            })
            timer = setTimeout(step, wait)
        }

        step()
        return () => {
            clearTimeout(timer)
            cancelAnimationFrame(frame)
        }
    }, [phrases, target, enabled])
}
