import { BuiltList } from './components/BuiltList'
import { Catalogue } from './components/Catalogue'
import { ChatWidget } from './components/ChatWidget'
import { Entry } from './components/Entry'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Section } from './components/Section'
import { DetailNotFound, ProjectPage } from './components/ProjectPage'
import { SystemPage } from './components/SystemPage'
import { DetailBar, TopBar, type NavItem } from './components/TopBar'
import { awards, certifications, education } from './data/about'
import { projects } from './data/projects'
import { systems } from './data/systems'
import type { Credential } from './data/types'
import { work } from './data/work'
import { detailFromRoute, detailHref, useHashRoute, type Detail } from './lib/router'
import { systemsForRole } from './lib/systems'
import { ToastProvider } from './lib/toast'
import { useActiveSection } from './lib/useActiveSection'
import { VerifyProvider } from './lib/verify'

const NAV: NavItem[] = [
    { id: 'about', label: 'about' },
    { id: 'work', label: 'work' },
    { id: 'projects', label: 'projects' },
    { id: 'education', label: 'education' },
    { id: 'certs', label: 'certs' },
]

const NAV_IDS = NAV.map((item) => item.id)

function CredentialList({ items }: { items: Credential[] }) {
    return (
        <ul className="stack">
            {items.map((item) => (
                <li key={item.institution} className="entry">
                    <div className="entry-head">
                        <h3 className="entry-title">{item.institution}</h3>
                        <p className="entry-period">{item.period}</p>
                    </div>
                    <p className="cred-detail">{item.detail}</p>
                    {item.note ? <p className="cred-note">{item.note}</p> : null}
                </li>
            ))}
        </ul>
    )
}

function Home() {
    return (
        <>
            <Header />

            <main>
                <Section id="work" title="Work">
                    <ul className="stack">
                        {work.map((role) => (
                            <Entry
                                key={role.id}
                                entry={role}
                                extra={<BuiltList systems={systemsForRole(role.id)} />}
                            />
                        ))}
                    </ul>
                </Section>

                <Section id="projects" title="Projects & Research">
                    <Catalogue
                        items={projects.map((item) => ({
                            id: item.id,
                            title: item.title,
                            summary: item.summary,
                            meta: [item.meta, item.period].filter(Boolean).join(' · '),
                            href: detailHref('projects', item.id),
                        }))}
                    />
                </Section>

                <Section id="education" title="Education">
                    <CredentialList items={education} />
                </Section>

                {awards.length > 0 ? (
                    <Section id="awards" title="Awards">
                        <ul className="stack">
                            {awards.map((award) => (
                                <li key={award.title} className="entry">
                                    <div className="entry-head">
                                        <h3 className="entry-title">{award.title}</h3>
                                        <p className="entry-period">{award.period}</p>
                                    </div>
                                    <p className="cred-detail">{award.org}</p>
                                </li>
                            ))}
                        </ul>
                    </Section>
                ) : null}

                <Section id="certs" title="Certifications">
                    <CredentialList items={certifications} />
                </Section>
            </main>
        </>
    )
}

function DetailRoute({ detail }: { detail: Detail }) {
    if (detail.kind === 'projects') {
        const project = projects.find((item) => item.id === detail.id)
        return project ? <ProjectPage project={project} /> : <DetailNotFound />
    }

    const system = systems.find((item) => item.id === detail.id)
    return system ? <SystemPage system={system} /> : <DetailNotFound />
}

export default function App() {
    const route = useHashRoute()
    const detail = detailFromRoute(route)
    const active = useActiveSection(NAV_IDS)

    return (
        <VerifyProvider>
            <ToastProvider>
                {detail ? <DetailBar /> : <TopBar items={NAV} active={active} />}
                <div className="shell">
                    {detail ? <DetailRoute detail={detail} /> : <Home />}
                    <Footer />
                </div>
                <ChatWidget />
            </ToastProvider>
        </VerifyProvider>
    )
}
