# Automated Client-Letter Platform

## Problem

Every client letter took an associate 2 to 5 minutes of manual assembly, pulling data scattered across the tabs of a legacy CRM. A backlog of over 5,000 cases had built up behind that, and it grew faster than the team could clear it.

## What I rejected

The CRM had no modern API and no vendor roadmap for one, so the default suggestion was browser automation driving the UI for every letter. That works in a demo and collapses in production: it is slow, it breaks on any markup change, and it cannot be parallelized without opening a browser per case. I reverse-engineered the internal endpoints the UI itself calls and drove those directly instead, keeping browser automation for exactly one job where nothing else would do.

## Design

The pipeline pulls structured and unstructured records through the internal API surface, filters candidate files by regex in Python, retrieves the PDFs, and fans Gemini calls out across Celery workers on Vertex AI to process transcripts alongside free-text task and activity records. Custom middleware bridges Azure Entra ID to the legacy session-based system so the whole thing runs under real identity rather than a shared login.

<figure class="diagram">
<svg viewBox="0 0 600 200" class="diagram-svg" role="img">
    <title>Credential rotation serialized by a Redis distributed lock</title>
    <text class="dg-edge" x="8" y="16">
        Celery workers
    </text>
    {[38, 78, 118].map((y, i) => (
        <g key={y}>
            <rect class="dg-box" x="1" y={y} width="104" height="30" rx="3" />
            <text class="dg-label" x="53" y={y + 19}>
                worker {i + 1}
            </text>
        </g>
    ))}
    <line class="dg-line" x1="105" y1="53" x2="171" y2="80" />
    <line class="dg-line" x1="105" y1="93" x2="171" y2="93" />
    <line class="dg-line" x1="105" y1="133" x2="171" y2="106" />
    <polygon class="dg-arrow" points="171,93 164,89.5 164,96.5" />
    <rect
        class="dg-box dg-costly"
        x="172"
        y="70"
        width="128"
        height="46"
        rx="3"
    />
    <text class="dg-label" x="236" y="89">
        Redis lock
    </text>
    <text class="dg-sub" x="236" y="104">
        one holder at a time
    </text>
    <line class="dg-line" x1="300" y1="93" x2="350" y2="93" />
    <polygon class="dg-arrow" points="350,93 343,89.5 343,96.5" />
    <text class="dg-edge" x="306" y="85">
        winner only
    </text>
    <rect class="dg-box" x="351" y="70" width="128" height="46" rx="3" />
    <text class="dg-label" x="415" y="89">
        Playwright
    </text>
    <text class="dg-sub" x="415" y="104">
        refresh session
    </text>
    <line class="dg-line" x1="479" y1="93" x2="529" y2="93" />
    <polygon class="dg-arrow" points="529,93 522,89.5 522,96.5" />
    <rect
        class="dg-box dg-cheap"
        x="530"
        y="70"
        width="69"
        height="46"
        rx="3"
    />
    <text class="dg-label" x="564" y="89">
        Postgres
    </text>
    <text class="dg-sub" x="564" y="104">
        state
    </text>
    <path
        class="dg-line dg-dashed"
        d="M564 116 L564 170 L53 170 L53 148"
        fill="none"
    />
    <polygon class="dg-arrow" points="53,148 49.5,155 56.5,155" />
    <text class="dg-edge" x="300" y="186">
        waiters read the rotated credential
    </text>
</svg>
<figcaption class="diagram-caption">One writer rotates credentials behind a Redis lock. Every other worker waits, then reads.</figcaption>
</figure>

## What broke first

Session credentials expire. The first version had each worker refresh them on demand, which was fine with one worker and a disaster with twenty — they all noticed the expiry at once, all refreshed simultaneously, and invalidated each other in a loop that took the integration down. The fix was a Playwright script wrapped in a Celery worker as the single writer, with Redis distributed locks serializing rotation and PostgreSQL holding the state. One worker rotates, the rest wait and read. Session updates became atomic, and the layer now recovers from expired credentials on its own instead of paging someone.

## Access and analytics

RBAC separates admins, who can edit letters in-app, from users who only generate them. Analytics land on both sides: client-side captures whether manual editing was needed, whether history was suppressed, whether the client is returning, who generated and audited each letter, and how long the audit took. Server-side metrics go to PostgreSQL, which is what let us prove the throughput numbers rather than assert them.

## Result

Letter generation went from 2–5 minutes per case to 5–40 seconds total across multiple concurrent cases. Associates went from 3–10 letters a day to 20–60, or 180–400 a week depending on volume — roughly 12× throughput, and about $80K a year in cost savings.

## What I would do differently

I would have designed for concurrent credential rotation from the start instead of discovering it under load. The single-writer-plus-lock pattern is well understood; I just had not thought of session state as shared mutable state until it behaved like it.
