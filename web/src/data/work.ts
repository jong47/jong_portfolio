import { newestFirst } from './order'
import type { Role } from './types'

const entries: Role[] = [
    {
        id: 'tra-senior-swe',
        title: 'Senior Software Engineer',
        meta: 'Tax Relief Advocates · Irvine, CA',
        period: '04/2026 — Present',
        bullets: [
            'Built a centralized LiteLLM gateway for 10+ internal applications, replacing direct Azure AI Foundry integrations with private-VNet routing, Redis-backed quota-aware load balancing, warm-model failover, and OpenTelemetry cost tracing.',
            'Architected and helped develop a real-time lead-alert system to reduce time-to-first outreach, enforcing single-owner delivery with Azure Service Bus and delivering Intune desktop alerts via Microsoft Graph and Entra ID within 2 seconds p95 of assignment.',
            'Reduced OCR and LLM inference costs 80% for a 100K+ page/week document pipeline by routing standard documents to asynchronous Databricks regex extraction and escalating corrupted or malformed files to Azure Document Intelligence and AI Foundry.',
            'Trained a supervised regression model on 10,000+ historical client cases to predict client service fees from 16–24 intake signals at first client contact, replacing manual fee estimation, with approximately 80% of predictions landing within 10% of actual fees on a held-out dataset.',
        ],
        stack: ['Azure', 'Event-driven architecture', 'Docker', 'Kubernetes', 'CI/CD'],
    },
    {
        id: 'tra-swe',
        title: 'Software Engineer',
        meta: 'Tax Relief Advocates · Irvine, CA',
        period: '03/2025 — 04/2026',
        bullets: [
            'Saved $80K annually by building an automated client-letter web app (React, TypeScript, FastAPI, Google Document AI, Gemini Platform) that cleared a manual backlog of 5,000+ client cases.',
            'Decreased executive dashboard SQL query latency by 87% (5 min to 40 sec) by reverse-engineering read-only database views and optimizing a query that returned 200K+ rows from a 1.32M row, 200+ column wide table.',
            'Reduced average tax record audit time by 17% building a horizontally scalable record-merging and deduplication pipeline with data lineage tracing (Celery, Redis, Python, Vertex AI).',
        ],
        stack: ['Azure', 'SQL optimization', 'REST APIs', 'Distributed systems'],
    },
]

export const work = newestFirst(entries)
