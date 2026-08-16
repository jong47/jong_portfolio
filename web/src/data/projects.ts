import prAgentArticle from '../content/oss-qodo-ai.md'
import { newestFirst } from './order'
import type { Project } from './types'

const entries: Project[] = [
    {
        id: 'layerskip',
        title: 'LayerSkip early-exit analysis',
        meta: 'Georgia Institute of Technology · with Mostafa Elhoushi, Meta AI',
        period: '2024',
        summary:
            'Whether mid-layer token switching is real instability or an artefact of the top-k window — the signal early-exit decisions depend on.',
        detail: 'Per-token early exit in Llama LayerSkip models, on a team led by Mostafa Elhoushi — first author of the LayerSkip paper. LayerSkip trains with layer dropout and a shared early-exit loss so a model can exit at an early layer and self-speculatively verify with the remaining ones, reaching 1.82× to 2.16× speedups on summarization, coding, and semantic parsing. Our work tracked layer-wise token prediction via top-k entropy, testing whether mid-layer token switching reflects genuine token instability or merely candidate removal from the top-k set. Early-exit strategies key off exactly that signal to decide when a token has settled enough to stop computing — read it wrong and you exit on a token that was still moving.',
        stack: ['Python', 'PyTorch', 'Torchvision', 'HuggingFace', 'NumPy', 'Jupyter'],
        link: {
            label: 'arXiv:2404.16710 — LayerSkip',
            href: 'https://arxiv.org/abs/2404.16710',
            external: true,
        },
    },
    {
        id: 'pr-agent-otel',
        title: 'OpenTelemetry for LiteLLM usage tracking',
        meta: 'qodo-ai/pr-agent · open source',
        period: '2026',
        summary:
            "OpenTelemetry instrumentation making an open-source agent's model spend visible per token, route, and completion.",
        detail: "A feature PR adding OpenTelemetry instrumentation for LiteLLM usage tracking — capturing token usage, model routing, and completion metrics so the agent's model spend is visible in monitoring tools like Datadog and Honeycomb.",
        article: prAgentArticle,
        stack: ['Python', 'OpenTelemetry', 'LiteLLM'],
        link: {
            label: 'qodo-ai/pr-agent',
            href: 'https://github.com/qodo-ai/pr-agent',
            external: true,
        },
    },
    {
        id: 'woolyquant',
        title: 'woolyquant',
        meta: 'Personal project',
        period: '2023',
        summary:
            'Stock analysis in Go that recommends strategies from market trends and the relationship between stock pairs.',
        detail: 'An AI-powered stock analysis tool that recommends trading strategies by analyzing market trends and the relationship between stock pairs.',
        stack: ['Go'],
        link: {
            label: 'jong47/woolyquant',
            href: 'https://github.com/jong47/woolyquant',
            external: true,
        },
    },
]

export const projects = newestFirst(entries)
