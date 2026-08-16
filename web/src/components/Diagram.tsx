type Props = {
    kind: 'document-routing' | 'session-rotation'
}

const CAPTION: Record<Props['kind'], string> = {
    'document-routing':
        'Well-formed documents take the deterministic path. Only the exceptions reach a model.',
    'session-rotation':
        'One writer rotates credentials behind a Redis lock. Every other worker waits, then reads.',
}

function DocumentRouting() {
    return (
        <svg viewBox="0 0 600 190" className="diagram-svg" role="img">
            <title>Document routing: regex path versus model path</title>

            <rect className="dg-box" x="1" y="70" width="112" height="46" rx="3" />
            <text className="dg-label" x="57" y="89">
                Documents
            </text>
            <text className="dg-sub" x="57" y="104">
                100K+ / week
            </text>

            <line className="dg-line" x1="113" y1="93" x2="163" y2="93" />
            <polygon className="dg-arrow" points="163,93 156,89.5 156,96.5" />

            <rect className="dg-box" x="164" y="70" width="104" height="46" rx="3" />
            <text className="dg-label" x="216" y="89">
                Classify
            </text>
            <text className="dg-sub" x="216" y="104">
                well-formed?
            </text>

            <path className="dg-line" d="M268 88 L300 88 L300 34 L336 34" fill="none" />
            <polygon className="dg-arrow" points="336,34 329,30.5 329,37.5" />
            <text className="dg-edge" x="304" y="26">
                yes — most of them
            </text>

            <path className="dg-line" d="M268 98 L300 98 L300 154 L336 154" fill="none" />
            <polygon className="dg-arrow" points="336,154 329,150.5 329,157.5" />
            <text className="dg-edge" x="304" y="171">
                no — the exceptions
            </text>

            <rect
                className="dg-box dg-cheap"
                x="337"
                y="11"
                width="150"
                height="46"
                rx="3"
            />
            <text className="dg-label" x="412" y="30">
                Databricks regex
            </text>
            <text className="dg-sub" x="412" y="45">
                async · deterministic
            </text>

            <rect
                className="dg-box dg-costly"
                x="337"
                y="131"
                width="150"
                height="46"
                rx="3"
            />
            <text className="dg-label" x="412" y="150">
                Doc Intelligence
            </text>
            <text className="dg-sub" x="412" y="165">
                + AI Foundry
            </text>

            <path className="dg-line" d="M487 34 L520 34 L520 88 L556 88" fill="none" />
            <path className="dg-line" d="M487 154 L520 154 L520 98 L556 98" fill="none" />
            <polygon className="dg-arrow" points="556,93 549,89.5 549,96.5" />

            <text className="dg-label" x="576" y="89">
                Silver
            </text>
            <text className="dg-sub" x="576" y="104">
                MongoDB
            </text>
        </svg>
    )
}

function SessionRotation() {
    return (
        <svg viewBox="0 0 600 200" className="diagram-svg" role="img">
            <title>Credential rotation serialized by a Redis distributed lock</title>

            <text className="dg-edge" x="8" y="16">
                Celery workers
            </text>
            {[38, 78, 118].map((y, i) => (
                <g key={y}>
                    <rect className="dg-box" x="1" y={y} width="104" height="30" rx="3" />
                    <text className="dg-label" x="53" y={y + 19}>
                        worker {i + 1}
                    </text>
                </g>
            ))}

            <line className="dg-line" x1="105" y1="53" x2="171" y2="80" />
            <line className="dg-line" x1="105" y1="93" x2="171" y2="93" />
            <line className="dg-line" x1="105" y1="133" x2="171" y2="106" />
            <polygon className="dg-arrow" points="171,93 164,89.5 164,96.5" />

            <rect
                className="dg-box dg-costly"
                x="172"
                y="70"
                width="128"
                height="46"
                rx="3"
            />
            <text className="dg-label" x="236" y="89">
                Redis lock
            </text>
            <text className="dg-sub" x="236" y="104">
                one holder at a time
            </text>

            <line className="dg-line" x1="300" y1="93" x2="350" y2="93" />
            <polygon className="dg-arrow" points="350,93 343,89.5 343,96.5" />
            <text className="dg-edge" x="306" y="85">
                winner only
            </text>

            <rect className="dg-box" x="351" y="70" width="128" height="46" rx="3" />
            <text className="dg-label" x="415" y="89">
                Playwright
            </text>
            <text className="dg-sub" x="415" y="104">
                refresh session
            </text>

            <line className="dg-line" x1="479" y1="93" x2="529" y2="93" />
            <polygon className="dg-arrow" points="529,93 522,89.5 522,96.5" />

            <rect
                className="dg-box dg-cheap"
                x="530"
                y="70"
                width="69"
                height="46"
                rx="3"
            />
            <text className="dg-label" x="564" y="89">
                Postgres
            </text>
            <text className="dg-sub" x="564" y="104">
                state
            </text>

            <path
                className="dg-line dg-dashed"
                d="M564 116 L564 170 L53 170 L53 148"
                fill="none"
            />
            <polygon className="dg-arrow" points="53,148 49.5,155 56.5,155" />
            <text className="dg-edge" x="300" y="186">
                waiters read the rotated credential
            </text>
        </svg>
    )
}

export function Diagram({ kind }: Props) {
    return (
        <figure className="diagram">
            {kind === 'document-routing' ? <DocumentRouting /> : <SessionRotation />}
            <figcaption className="diagram-caption">{CAPTION[kind]}</figcaption>
        </figure>
    )
}
