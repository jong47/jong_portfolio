export type Link = {
    label: string
    href: string
    external?: boolean
    /** Opens the contact dialog instead of navigating. */
    dialog?: boolean
}

export type Entry = {
    id: string
    title: string
    meta?: string
    period: string
    metrics?: string[]
    detail?: string
    bullets?: string[]
    stack?: string[]
    link?: Link
}

export type SystemSection = {
    heading: string
    body: string
}

export type System = Entry & {
    roleIds: string[]
    summary: string
    sections?: SystemSection[]
    diagram?: 'document-routing' | 'session-rotation'
}

export type Project = Entry & {
    /** One line for the landing card; `detail` is kept for the project's own route. */
    summary: string
    /** Compiled from src/content/<id>.md at build time. */
    article?: string
}

export type Profile = {
    name: string
    /** Cycled one at a time in the header, so each reads on from "I'm". */
    roles: string[]
    current: string
    location: string
    note: string
    links: Link[]
}

export type Award = {
    title: string
    org: string
    period: string
}

export type Credential = {
    institution: string
    detail: string
    period: string
    note?: string
}
