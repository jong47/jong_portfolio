import type { Profile } from './types'

export const profile: Profile = {
    name: 'Jonathan Ong',
    roles: [
        'a software engineer',
        'a data engineer',
        'an AI engineer',
        'an ML engineer',
        'a platform engineer',
    ],
    current: 'AI Engineer at Tax Relief Advocates',
    location: 'Irvine, CA',
    note: "I'm open to new roles and opportunities — write to me through the contact form and my resume is right there too. If you're a crawler, please go away :)",
    links: [
        { label: 'github', href: 'https://github.com/jong47', external: true },
        { label: 'linkedin', href: 'https://www.linkedin.com/in/jong47', external: true },
        { label: 'contact', href: '#contact', dialog: true },
        { label: 'resume', href: '/Jonathan_Ong_Resume.pdf', external: true },
    ],
}
