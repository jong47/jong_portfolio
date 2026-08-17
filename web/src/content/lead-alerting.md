# Real-Time Lead Alerting

## Problem

Time-to-first-outreach on inbound leads was the metric that mattered, and the existing flow had no push at all — reps found out they owned a lead the next time they happened to look.

## Design

Azure Service Bus enforces single-owner delivery, so exactly one rep is notified per assignment: no double-contact, and no lead silently owned by nobody. Alerts surface as Intune desktop notifications delivered through Microsoft Graph with Entra ID auth, landing within 2 seconds p95 of assignment.
