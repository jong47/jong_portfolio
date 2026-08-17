# Document Processing Platform

## Problem

Client tax records arrive as transcripts running 700 to 1,000+ pages each, at over 100,000 pages a week. Everything downstream — case review, letter generation, audit — depends on structured data pulled out of them, and every page of it was being handled by hand or by an expensive generic pipeline.

## v1 — Dagster on Render

The first version was a medallion-architecture pipeline orchestrated by Dagster, running on Render. Celery workers parallelized the extraction requests, Flower monitored task state, and Redis re-queued anything that failed, so a bad batch degraded throughput instead of dropping data. Raw documents landed in ADLS2 as the bronze layer, cleaned records in MongoDB as silver, with a second ingest path writing raw extractions to PostgreSQL.

## The constraint that forced a rewrite

The architecture was fine. The hosting was not. Handling regulated tax data meant the entire platform had to sit inside our Azure compliance boundary, which Render was never going to satisfy. That was a non-technical requirement that invalidated a working system, so we re-platformed the whole thing onto Azure rather than trying to carve out an exception.

## What I rejected

The obvious path was to lift the pipeline onto Azure unchanged and call it done. I used the migration as the moment to question the thing nobody had questioned: every document was being sent through OCR and an LLM, including the overwhelming majority that were well-formed and utterly predictable. We were paying model prices for work a regex could do deterministically — and doing it 100,000 times a week.

## Design

Documents are classified on arrival. Well-formed ones route to asynchronous regex extraction on Databricks, which is cheap, fast, and produces the same answer every time. Only corrupted or malformed files escalate to Azure Document Intelligence and AI Foundry. Most of the corpus never touches a model, and the model budget goes entirely to the documents that actually need judgment.

<figure class="diagram">
<svg viewBox="0 0 600 190" class="diagram-svg" role="img">
    <title>Document routing: regex path versus model path</title>
    <rect class="dg-box" x="1" y="70" width="112" height="46" rx="3" />
    <text class="dg-label" x="57" y="89">
        Documents
    </text>
    <text class="dg-sub" x="57" y="104">
        100K+ / week
    </text>
    <line class="dg-line" x1="113" y1="93" x2="163" y2="93" />
    <polygon class="dg-arrow" points="163,93 156,89.5 156,96.5" />
    <rect class="dg-box" x="164" y="70" width="104" height="46" rx="3" />
    <text class="dg-label" x="216" y="89">
        Classify
    </text>
    <text class="dg-sub" x="216" y="104">
        well-formed?
    </text>
    <path class="dg-line" d="M268 88 L300 88 L300 34 L336 34" fill="none" />
    <polygon class="dg-arrow" points="336,34 329,30.5 329,37.5" />
    <text class="dg-edge" x="304" y="26">
        yes — most of them
    </text>
    <path class="dg-line" d="M268 98 L300 98 L300 154 L336 154" fill="none" />
    <polygon class="dg-arrow" points="336,154 329,150.5 329,157.5" />
    <text class="dg-edge" x="304" y="171">
        no — the exceptions
    </text>
    <rect
        class="dg-box dg-cheap"
        x="337"
        y="11"
        width="150"
        height="46"
        rx="3"
    />
    <text class="dg-label" x="412" y="30">
        Databricks regex
    </text>
    <text class="dg-sub" x="412" y="45">
        async · deterministic
    </text>
    <rect
        class="dg-box dg-costly"
        x="337"
        y="131"
        width="150"
        height="46"
        rx="3"
    />
    <text class="dg-label" x="412" y="150">
        Doc Intelligence
    </text>
    <text class="dg-sub" x="412" y="165">
        + AI Foundry
    </text>
    <path class="dg-line" d="M487 34 L520 34 L520 88 L556 88" fill="none" />
    <path class="dg-line" d="M487 154 L520 154 L520 98 L556 98" fill="none" />
    <polygon class="dg-arrow" points="556,93 549,89.5 549,96.5" />
    <text class="dg-label" x="576" y="89">
        Silver
    </text>
    <text class="dg-sub" x="576" y="104">
        MongoDB
    </text>
</svg>
<figcaption class="diagram-caption">Well-formed documents take the deterministic path. Only the exceptions reach a model.</figcaption>
</figure>

## Result

Inference cost fell 80% at unchanged volume, and the deterministic path is more accurate than the model path on the documents it handles, because regex does not hallucinate a field that was never there. This is the work behind my promotion to AI Engineer.

## What I would do differently

I would have built the classifier and the routing split before the migration rather than during it, so the two changes could be measured independently. Bundling a re-platform with an architectural change made it harder to attribute the cost drop, and if either had regressed I would have had two suspects instead of one.
