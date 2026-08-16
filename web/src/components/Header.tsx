import { useState } from 'react'
import { profile } from '../data/profile'
import { Anchor } from './Anchor'
import { ContactDialog } from './ContactDialog'
import { Roles } from './Roles'

export function Header() {
    const [contact, setContact] = useState(false)

    return (
        <header id="about">
            <h1 className="t-name">{profile.name}</h1>
            <Roles />

            <p className="hero-note mt-3">
                <span className="hero-now">{profile.current}</span> · {profile.location}
            </p>
            <p className="hero-note mt-1">{profile.note}</p>

            <nav className="row mt-6" aria-label="Profile links">
                {profile.links.map((link) => (
                    <Anchor
                        key={link.label}
                        link={link}
                        className="link-nav"
                        onDialog={() => setContact(true)}
                    />
                ))}
            </nav>

            <ContactDialog open={contact} onClose={() => setContact(false)} />
        </header>
    )
}
