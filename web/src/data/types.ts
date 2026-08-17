export type Link = {
    label: string
    href: string
    external?: boolean
    /** Opens the contact dialog instead of navigating. */
    dialog?: boolean
}

/** The work-history ids systems.ts is allowed to point at. Renaming a role here
 *  breaks both files until they agree, rather than leaving a section that quietly
 *  renders empty. */
export type RoleId =
    | 'tra-senior-swe'
    | 'tra-swe'
    | 'fdb-ai-intern'
    | 'king-features-ba-intern'
    | 'csuf-research-assistant'
    | 'biscuit-beacon-swe-intern'
    | 'briviant-it-support'
    | 'socccd-lab-tutor'

export type Entry = {
    id: string
    title: string
    meta?: string
    period: string
    metrics?: string[]
    detail?: string
    bullets?: string[]
    stack?: string[]
    links?: Link[]
}

export type Role = Entry & {
    id: RoleId
}

export type System = Entry & {
    roleIds: RoleId[]
    summary: string
    /** Compiled from src/content/<id>.md at build time. */
    article?: string
}

/** What the timeline labels each row with. */
export type ProjectKind = 'oss' | 'research' | 'personal'

export type Project = Entry & {
    kind: ProjectKind
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
