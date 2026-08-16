import { newestFirst } from './order'
import type { System } from './types'

const entries: System[] = [
    {
        id: 'document-platform',
        roleIds: ['tra-swe', 'tra-senior-swe'],
        title: 'Document Processing Platform',
        meta: 'Tax Relief Advocates',
        period: '2025 — 2026',
        summary:
            'Extraction over 1000-page tax documents, re-platformed onto Azure for compliance, then made 80% cheaper by keeping most of it away from a model.',
        metrics: [
            '80% OCR + LLM cost reduction',
            '100K+ pages/week',
            '700–1000+ pages per document',
        ],
        stack: [
            'Dagster',
            'Celery',
            'Redis',
            'Flower',
            'Python',
            'Databricks',
            'ADLS2',
            'MongoDB',
            'PostgreSQL',
            'Azure Document Intelligence',
            'Azure AI Foundry',
            'Azure',
        ],
        diagram: 'document-routing',
        sections: [
            {
                heading: 'Problem',
                body: 'Client tax records arrive as transcripts running 700 to 1,000+ pages each, at over 100,000 pages a week. Everything downstream — case review, letter generation, audit — depends on structured data pulled out of them, and every page of it was being handled by hand or by an expensive generic pipeline.',
            },
            {
                heading: 'v1 — Dagster on Render',
                body: 'The first version was a medallion-architecture pipeline orchestrated by Dagster, running on Render. Celery workers parallelized the extraction requests, Flower monitored task state, and Redis re-queued anything that failed, so a bad batch degraded throughput instead of dropping data. Raw documents landed in ADLS2 as the bronze layer, cleaned records in MongoDB as silver, with a second ingest path writing raw extractions to PostgreSQL.',
            },
            {
                heading: 'The constraint that forced a rewrite',
                body: 'The architecture was fine. The hosting was not. Handling regulated tax data meant the entire platform had to sit inside our Azure compliance boundary, which Render was never going to satisfy. That was a non-technical requirement that invalidated a working system, so we re-platformed the whole thing onto Azure rather than trying to carve out an exception.',
            },
            {
                heading: 'What I rejected',
                body: 'The obvious path was to lift the pipeline onto Azure unchanged and call it done. I used the migration as the moment to question the thing nobody had questioned: every document was being sent through OCR and an LLM, including the overwhelming majority that were well-formed and utterly predictable. We were paying model prices for work a regex could do deterministically — and doing it 100,000 times a week.',
            },
            {
                heading: 'Design',
                body: 'Documents are classified on arrival. Well-formed ones route to asynchronous regex extraction on Databricks, which is cheap, fast, and produces the same answer every time. Only corrupted or malformed files escalate to Azure Document Intelligence and AI Foundry. Most of the corpus never touches a model, and the model budget goes entirely to the documents that actually need judgment.',
            },
            {
                heading: 'Result',
                body: 'Inference cost fell 80% at unchanged volume, and the deterministic path is more accurate than the model path on the documents it handles, because regex does not hallucinate a field that was never there. This is the work behind my promotion to AI Engineer.',
            },
            {
                heading: 'What I would do differently',
                body: 'I would have built the classifier and the routing split before the migration rather than during it, so the two changes could be measured independently. Bundling a re-platform with an architectural change made it harder to attribute the cost drop, and if either had regressed I would have had two suspects instead of one.',
            },
        ],
    },
    {
        id: 'client-letter-platform',
        roleIds: ['tra-swe'],
        title: 'Automated Client-Letter Platform',
        meta: 'Tax Relief Advocates',
        period: '2025',
        summary:
            'Letter generation against a legacy CRM with no modern API surface, and the concurrency problem underneath it.',
        metrics: [
            '2–5 min → 5–40 s per letter',
            '12× throughput',
            '~$80K/yr saved',
            '5,000+ case backlog cleared',
        ],
        stack: [
            'Python',
            'Celery',
            'Redis',
            'PostgreSQL',
            'Playwright',
            'Vertex AI',
            'Gemini',
            'Google Document AI',
            'Entra ID',
            'FastAPI',
            'React',
            'TypeScript',
            'REST APIs',
        ],
        diagram: 'session-rotation',
        sections: [
            {
                heading: 'Problem',
                body: 'Every client letter took an associate 2 to 5 minutes of manual assembly, pulling data scattered across the tabs of a legacy CRM. A backlog of over 5,000 cases had built up behind that, and it grew faster than the team could clear it.',
            },
            {
                heading: 'What I rejected',
                body: 'The CRM had no modern API and no vendor roadmap for one, so the default suggestion was browser automation driving the UI for every letter. That works in a demo and collapses in production: it is slow, it breaks on any markup change, and it cannot be parallelized without opening a browser per case. I reverse-engineered the internal endpoints the UI itself calls and drove those directly instead, keeping browser automation for exactly one job where nothing else would do.',
            },
            {
                heading: 'Design',
                body: 'The pipeline pulls structured and unstructured records through the internal API surface, filters candidate files by regex in Python, retrieves the PDFs, and fans Gemini calls out across Celery workers on Vertex AI to process transcripts alongside free-text task and activity records. Custom middleware bridges Azure Entra ID to the legacy session-based system so the whole thing runs under real identity rather than a shared login.',
            },
            {
                heading: 'What broke first',
                body: 'Session credentials expire. The first version had each worker refresh them on demand, which was fine with one worker and a disaster with twenty — they all noticed the expiry at once, all refreshed simultaneously, and invalidated each other in a loop that took the integration down. The fix was a Playwright script wrapped in a Celery worker as the single writer, with Redis distributed locks serializing rotation and PostgreSQL holding the state. One worker rotates, the rest wait and read. Session updates became atomic, and the layer now recovers from expired credentials on its own instead of paging someone.',
            },
            {
                heading: 'Access and analytics',
                body: 'RBAC separates admins, who can edit letters in-app, from users who only generate them. Analytics land on both sides: client-side captures whether manual editing was needed, whether history was suppressed, whether the client is returning, who generated and audited each letter, and how long the audit took. Server-side metrics go to PostgreSQL, which is what let us prove the throughput numbers rather than assert them.',
            },
            {
                heading: 'Result',
                body: 'Letter generation went from 2–5 minutes per case to 5–40 seconds total across multiple concurrent cases. Associates went from 3–10 letters a day to 20–60, or 180–400 a week depending on volume — roughly 12× throughput, and about $80K a year in cost savings.',
            },
            {
                heading: 'What I would do differently',
                body: 'I would have designed for concurrent credential rotation from the start instead of discovering it under load. The single-writer-plus-lock pattern is well understood; I just had not thought of session state as shared mutable state until it behaved like it.',
            },
        ],
    },
    {
        id: 'llm-gateway',
        roleIds: ['tra-senior-swe'],
        title: 'LLM Gateway',
        meta: 'Tax Relief Advocates',
        period: '2026',
        summary: 'One front door to every model, replacing per-application integrations.',
        metrics: ['10+ internal applications'],
        stack: [
            'LiteLLM',
            'Azure AI Foundry',
            'Redis',
            'OpenTelemetry',
            'Azure VNet',
            'Python',
            'Azure',
        ],
        sections: [
            {
                heading: 'Problem',
                body: 'Ten-plus internal applications each held their own direct Azure AI Foundry integration. That meant ten places to rotate keys, ten quota ceilings hit independently while capacity sat idle elsewhere, and no way to answer what any of it cost.',
            },
            {
                heading: 'Design',
                body: 'A centralized LiteLLM gateway routes all traffic over a private VNet. Redis backs quota-aware load balancing across deployments, and warm-model failover keeps requests serviceable when a deployment saturates or goes down. OpenTelemetry traces carry cost attribution, so per-application spend is visible without every team instrumenting its own calls.',
            },
            {
                heading: 'Result',
                body: 'Model access became one integration to maintain instead of ten, quota is pooled rather than stranded, and cost is attributable per application for the first time.',
            },
        ],
    },
    {
        id: 'lead-alerting',
        roleIds: ['tra-senior-swe'],
        title: 'Real-Time Lead Alerting',
        meta: 'Tax Relief Advocates',
        period: '2026',
        summary:
            'Desktop alerts on the sales floor within two seconds of lead assignment.',
        metrics: ['< 2 s p95 from assignment to alert'],
        stack: [
            'Azure Service Bus',
            'Microsoft Graph',
            'Microsoft Intune',
            'Entra ID',
            'Python',
            'Event-driven architecture',
            'Azure',
        ],
        sections: [
            {
                heading: 'Problem',
                body: 'Time-to-first-outreach on inbound leads was the metric that mattered, and the existing flow had no push at all — reps found out they owned a lead the next time they happened to look.',
            },
            {
                heading: 'Design',
                body: 'Azure Service Bus enforces single-owner delivery, so exactly one rep is notified per assignment: no double-contact, and no lead silently owned by nobody. Alerts surface as Intune desktop notifications delivered through Microsoft Graph with Entra ID auth, landing within 2 seconds p95 of assignment.',
            },
        ],
    },
    {
        id: 'fee-prediction',
        roleIds: ['tra-senior-swe'],
        title: 'Service-Fee Prediction Model',
        meta: 'Tax Relief Advocates',
        period: '2026',
        summary: 'Replacing manual fee estimation at first client contact.',
        metrics: ['10,000+ cases trained on', '~80% within 10% of actual'],
        stack: ['Python', 'SQL', 'Supervised regression'],
        sections: [
            {
                heading: 'Problem',
                body: 'Service fees were estimated by hand at first client contact, from whatever the intake call surfaced. Estimates varied by who took the call, and there was no baseline to measure them against.',
            },
            {
                heading: 'Design',
                body: 'A supervised regression model trained on 10,000+ historical cases, predicting fees from the 16–24 intake signals available at the moment of first contact — deliberately restricted to what is actually knowable that early, rather than what is knowable in hindsight.',
            },
            {
                heading: 'Result',
                body: 'On a held-out dataset, roughly 80% of predictions land within 10% of the fee actually charged.',
            },
        ],
    },
]

export const systems = newestFirst(entries)
