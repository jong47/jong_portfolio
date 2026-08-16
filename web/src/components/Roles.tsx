import { useRef } from 'react'
import { profile } from '../data/profile'
import { usePrefersReducedMotion, useTypewriter } from '../lib/typewriter'

export function Roles() {
    const still = usePrefersReducedMotion()
    const word = useRef<HTMLSpanElement>(null)

    useTypewriter(profile.roles, word, !still)

    return (
        <p className="roles">
            <span className="sr-only">I'm {profile.roles.join(', ')}.</span>
            <span aria-hidden="true">
                I'm{' '}
                <span className="roles-word" ref={word}>
                    {still ? profile.roles[0] : null}
                </span>
                {still ? null : <span className="roles-caret" />}
            </span>
        </p>
    )
}
