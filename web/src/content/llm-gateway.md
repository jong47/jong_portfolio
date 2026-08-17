# LLM Gateway

## Problem

Ten-plus internal applications each held their own direct Azure AI Foundry integration. That meant ten places to rotate keys, ten quota ceilings hit independently while capacity sat idle elsewhere, and no way to answer what any of it cost.

## Design

A centralized LiteLLM gateway routes all traffic over a private VNet. Redis backs quota-aware load balancing across deployments, and warm-model failover keeps requests serviceable when a deployment saturates or goes down. OpenTelemetry traces carry cost attribution, so per-application spend is visible without every team instrumenting its own calls.

## Result

Model access became one integration to maintain instead of ten, quota is pooled rather than stranded, and cost is attributable per application for the first time.
