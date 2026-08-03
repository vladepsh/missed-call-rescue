# Security and privacy

This repository is a local portfolio demonstration and should never receive
real customer data, credentials, provider tokens, or production exports.

## Supported scope

- The application binds to `127.0.0.1` by default.
- All committed lead records are synthetic `555` fixtures.
- Simulated actions remain in browser memory and disappear on reset/reload.
- No external messaging, telephony, analytics, or database service is called.

## Reporting

If this repository becomes public, report a suspected vulnerability privately
through the repository owner's GitHub security advisory page. Do not include
real personal information in a report.

## Production warning

Do not deploy this prototype as a customer-facing service. A production build
requires authentication, authorization, encrypted durable storage, verified
provider webhooks, rate limits, monitoring, consent evidence, retention and
deletion controls, STOP handling, and a formal privacy/security review.

