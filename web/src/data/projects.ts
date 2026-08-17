import prAgentOtelArticle from '../content/pr-agent-otel.md'
import portfolioArticle from '../content/portfolio.md'
import { newestFirst } from './order'
import type { Project } from './types'

const entries: Project[] = [
    {
        id: 'portfolio',
        kind: 'personal',
        title: 'This site',
        meta: 'jong47/jong_portfolio',
        period: '2026',
        summary:
            'A portfolio that hands a person a way to reach me and hands a crawler nothing, with the case studies compiled at build time.',
        detail: 'A React 19 front end and a FastAPI contact service, deliberately kept as two projects that share nothing but one environment variable. My address never enters the bundle — the form posts to the API, which sends through SES from a verified identity with the visitor in Reply-To, and the route answers 204 so there is no body to leak from. Case studies are markdown compiled to HTML at build time by marked and shiki, so neither the parser nor the highlighter ships to the browser. Routing is hash-based, which is what lets the whole thing sit on static hosting with no rewrite rules.',
        article: portfolioArticle,
        stack: [
            'React',
            'TypeScript',
            'Tailwind',
            'Vite',
            'FastAPI',
            'Python',
            'AWS SES',
            'Playwright',
        ],
        links: [
            {
                label: 'jong47/jong_portfolio',
                href: 'https://github.com/jong47/jong_portfolio',
                external: true,
            },
        ],
    },
    {
        id: 'layerskip',
        kind: 'research',
        title: 'LayerSkip early-exit analysis',
        meta: 'with Mostafa Elhoushi, Meta AI · Georgia Tech',
        period: '2024',
        summary:
            'Whether mid-layer token switching is real instability or an artefact of the top-k window — the signal early-exit decisions depend on.',
        detail: 'Per-token early exit in Llama LayerSkip models, on a team led by Mostafa Elhoushi — first author of the LayerSkip paper. LayerSkip trains with layer dropout and a shared early-exit loss so a model can exit at an early layer and self-speculatively verify with the remaining ones, reaching 1.82× to 2.16× speedups on summarization, coding, and semantic parsing. Our work tracked layer-wise token prediction via top-k entropy, testing whether mid-layer token switching reflects genuine token instability or merely candidate removal from the top-k set. Early-exit strategies key off exactly that signal to decide when a token has settled enough to stop computing — read it wrong and you exit on a token that was still moving.',
        stack: ['Python', 'PyTorch', 'Torchvision', 'HuggingFace', 'NumPy', 'Jupyter'],
        links: [
            {
                label: 'arXiv:2404.16710 — LayerSkip',
                href: 'https://arxiv.org/abs/2404.16710',
                external: true,
            },
        ],
    },
    {
        id: 'pr-agent-otel',
        kind: 'oss',
        title: 'OpenTelemetry for LiteLLM usage tracking',
        meta: 'qodo-ai/pr-agent',
        period: '2026',
        summary:
            "OpenTelemetry instrumentation making an open-source agent's model spend visible per token, route, and completion.",
        detail: "A feature PR adding OpenTelemetry instrumentation for LiteLLM usage tracking — capturing token usage, model routing, and completion metrics so the agent's model spend is visible in monitoring tools like Datadog and Honeycomb.",
        article: prAgentOtelArticle,
        stack: ['Python', 'OpenTelemetry', 'LiteLLM'],
        links: [
            {
                label: 'qodo-ai/pr-agent',
                href: 'https://github.com/qodo-ai/pr-agent',
                external: true,
            },
        ],
    },
    {
        id: 'woolyquant',
        kind: 'personal',
        title: 'woolyquant',
        period: '2023',
        summary:
            'Stock analysis in Go that recommends strategies from market trends and the relationship between stock pairs.',
        detail: 'An AI-powered stock analysis tool that recommends trading strategies by analyzing market trends and the relationship between stock pairs.',
        stack: ['Go'],
        links: [
            {
                label: 'jong47/woolyquant',
                href: 'https://github.com/jong47/woolyquant',
                external: true,
            },
        ],
    },
]

export const projects = newestFirst(entries)
