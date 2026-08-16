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
    {
        id: 'fdb-ai-intern',
        title: 'AI Engineer Intern',
        meta: 'First Databank · Remote',
        period: '06/2024 — 08/2024',
        bullets: [
            'Built a RAG prototype on Azure GPT-4o over HIPAA-governed case study data, and fine-tuned a GPT-4o bot for case study content generation.',
            'Worked with stakeholder groups to design a framework for candidate identification and engagement in the case study process.',
        ],
        stack: ['Python', 'Azure OpenAI', 'Amazon Bedrock', 'RAG'],
    },
    {
        id: 'king-features-ba-intern',
        title: 'Business Analyst Intern',
        meta: 'King Features, a unit of Hearst · Remote',
        period: '06/2024 — 08/2024',
        bullets: [
            'Ran a competitive landscape analysis identifying new revenue streams, and built data-driven expansion strategies covering market growth and app development, aligned to existing company strengths.',
        ],
        stack: ['Competitive analysis', 'KPIs'],
    },
    {
        id: 'csuf-research-assistant',
        title: 'Undergraduate Research Assistant',
        meta: 'California State University, Fullerton · Hybrid',
        period: '08/2023 — 12/2023',
        bullets: ['Worked on the 3D printing team under Dr. Yu Bai.'],
        stack: ['Python', 'NumPy'],
    },
    {
        id: 'biscuit-beacon-swe-intern',
        title: 'Software Engineer Intern',
        meta: 'Biscuit Beacon · Remote',
        period: '08/2023 — 11/2023',
        bullets: [
            'Dev lead for the website team — set coding standards, converted the product backlog into feature-driven tasks, and worked directly with stakeholders.',
        ],
        stack: ['React', 'Software development'],
    },
    {
        id: 'briviant-it-support',
        title: 'IT Support Engineer',
        meta: 'Briviant · Irvine, CA',
        period: '10/2021 — 06/2022',
        bullets: [
            'Raised team efficiency 30% writing BASH tooling that automated internal hard-disk verification for critical system updates and streamlined user verification during a migration project.',
            'Triaged and resolved end-user issues across physical and virtual macOS machines, including RDP connection faults and OS-level restrictions.',
            'Deployed and acceptance-tested macOS and VMware ESXi Mac Minis shipped to domestic and international data centres, and owned the system and network documentation for new server builds.',
        ],
        stack: ['macOS', 'BASH', 'VMware ESXi', 'Networking'],
    },
    {
        id: 'socccd-lab-tutor',
        title: 'Lab Tutor',
        meta: 'South Orange County Community College District · Irvine, CA',
        period: '08/2018 — 03/2020',
        bullets: [
            'Taught software engineering practice and object-oriented design in C++, and tutored data structures and algorithms in Python and C++ including Big-O analysis of run time and space.',
        ],
        stack: ['C++', 'Python', 'Algorithms'],
    },
]

export const work = newestFirst(entries)
