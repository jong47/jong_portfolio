# Service-Fee Prediction Model

## Problem

Service fees were estimated by hand at first client contact, from whatever the intake call surfaced. Estimates varied by who took the call, and there was no baseline to measure them against.

## Design

A supervised regression model trained on 10,000+ historical cases, predicting fees from the 16–24 intake signals available at the moment of first contact — deliberately restricted to what is actually knowable that early, rather than what is knowable in hindsight.

## Result

On a held-out dataset, roughly 80% of predictions land within 10% of the fee actually charged.
