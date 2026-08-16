import type { Award, Credential } from './types'

export const awards: Award[] = []

export const education: Credential[] = [
    {
        institution: 'Georgia Institute of Technology',
        detail: 'MS in Computer Science',
        period: 'expected 12/2028',
        note: 'Member of DS@GT.',
    },
    {
        institution: 'California State University, Fullerton',
        detail: 'BS in Computer Science',
        period: '12/2023',
    },
]

export const certifications: Credential[] = [
    {
        institution: 'Amazon Web Services',
        detail: 'Certified Solutions Architect – Associate',
        period: '04/2024',
    },
]
