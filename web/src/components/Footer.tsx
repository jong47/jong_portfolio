import { useState } from 'react'

const MESSAGES = [
    'The dragon was a race condition all along.',
    'Somewhere, a Celery worker is still retrying.',
    'Rolled a natural 20 on the deploy.',
    'The cache was the real treasure.',
    'Here be dragons, and a few TODOs.',
    'Off adventuring in a distributed system.',
    'The prophecy said the logs would be readable. The prophecy lied.',
    'Slaying latency, one query at a time.',
    'You found a secret. It is just a footer.',
    'Redis holds the lock. Redis holds the power.',
    'No wizards were harmed in the making of this site.',
    'Currently accepting side quests.',
    'It works on my machine, and now on yours.',
    'The retry queue is eternal. Be kind to it.',
    'Somewhere a p99 is having a very bad day.',
]

function randomMessage() {
    return MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
}

export function Footer() {
    const [message] = useState(randomMessage)

    return (
        <footer className="footer">
            <p className="t-meta">Jonathan Ong · {new Date().getFullYear()}</p>
            <p className="t-meta">Built with Vite, React, Tailwind</p>
            <p className="footer-flavor">{message}</p>
        </footer>
    )
}
