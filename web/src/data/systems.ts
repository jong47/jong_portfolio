import document_platformArticle from '../content/document-platform.md'
import client_letter_platformArticle from '../content/client-letter-platform.md'
import llm_gatewayArticle from '../content/llm-gateway.md'
import lead_alertingArticle from '../content/lead-alerting.md'
import fee_predictionArticle from '../content/fee-prediction.md'
import { newestFirst } from './order'
import type { System } from './types'

const entries: System[] = [
    {
        id: 'document-platform',
        article: document_platformArticle,
        roleIds: ['tra-swe', 'tra-senior-swe'],
        title: 'Document Processing Platform',
        meta: 'Tax Relief Advocates',
        period: '2025 — 2026',
        summary:
            'Extraction over 1000-page tax documents, re-platformed onto Azure for compliance, then made 80% cheaper by keeping most of it away from a model.',
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
    },
    {
        id: 'client-letter-platform',
        article: client_letter_platformArticle,
        roleIds: ['tra-swe'],
        title: 'Automated Client-Letter Platform',
        meta: 'Tax Relief Advocates',
        period: '2025',
        summary:
            'Letter generation against a legacy CRM with no modern API surface, and the concurrency problem underneath it.',
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
    },
    {
        id: 'llm-gateway',
        article: llm_gatewayArticle,
        roleIds: ['tra-senior-swe'],
        title: 'LLM Gateway',
        meta: 'Tax Relief Advocates',
        period: '2026',
        summary: 'One front door to every model, replacing per-application integrations.',
        stack: [
            'LiteLLM',
            'Azure AI Foundry',
            'Redis',
            'OpenTelemetry',
            'Azure VNet',
            'Python',
            'Azure',
        ],
    },
    {
        id: 'lead-alerting',
        article: lead_alertingArticle,
        roleIds: ['tra-senior-swe'],
        title: 'Real-Time Lead Alerting',
        meta: 'Tax Relief Advocates',
        period: '2026',
        summary:
            'Desktop alerts on the sales floor within two seconds of lead assignment.',
        stack: [
            'Azure Service Bus',
            'Microsoft Graph',
            'Microsoft Intune',
            'Entra ID',
            'Python',
            'Event-driven architecture',
            'Azure',
        ],
    },
    {
        id: 'fee-prediction',
        article: fee_predictionArticle,
        roleIds: ['tra-senior-swe'],
        title: 'Service-Fee Prediction Model',
        meta: 'Tax Relief Advocates',
        period: '2026',
        summary: 'Replacing manual fee estimation at first client contact.',
        stack: ['Python', 'SQL', 'Supervised regression'],
    },
]

export const systems = newestFirst(entries)
