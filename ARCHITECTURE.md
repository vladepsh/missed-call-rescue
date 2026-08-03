# Architecture

## System shape

Missed-Call Rescue Desk is a local-first portfolio demo. A small Node.js server
serves a dependency-free browser application and a synthetic lead fixture.

```text
Browser UI
  ├─ missed-call queue
  ├─ structured intake and workflow actions
  ├─ human approval queue
  ├─ controlled message templates
  └─ in-memory session audit trail
           │
           ▼
Node HTTP server
  ├─ GET /api/health
  ├─ GET /api/leads
  └─ static public assets
           │
           ▼
Synthetic JSON fixtures
```

## Key files

| Path | Responsibility |
|---|---|
| `server.js` | Static server, demo API, path containment, security headers |
| `public/index.html` | Semantic application shell and accessible controls |
| `public/app.js` | Workflow state, guardrails, rendering, and session audit |
| `public/style.css` | Responsive desktop/mobile presentation |
| `data/demo-leads.json` | Synthetic seed scenarios |
| `tests/server.test.js` | API, security header, method, and path tests |
| `tests/e2e/` | Desktop/mobile workflow and policy tests |

## Trust boundaries

- The server reads only committed static assets and synthetic fixtures.
- Static file resolution is contained to `public/`.
- Unsupported HTTP methods return `405`.
- A restrictive content security policy and defensive response headers are
  applied to every response.
- Browser rendering escapes fixture and session values before inserting them.
- The demo binds only to `127.0.0.1` by default.

## State model

Lead state exists only in the active browser tab. Resetting or reloading the
demo restores the original fixture. Session audit events are generated in
memory and are intentionally not persisted.

The key policy rule is independent of workflow status: `opted_out` consent or
a `do_not_contact` risk flag blocks any simulated external action and cannot be
overridden by the approval path.

## Production evolution

A production implementation would need authenticated role-based access,
encrypted durable storage, provider webhooks, idempotency, signed event
verification, rate limiting, monitoring, retention and deletion controls,
consent evidence, STOP handling, and jurisdiction-specific compliance review.

