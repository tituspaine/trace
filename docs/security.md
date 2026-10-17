# TRACE security and privacy model

TRACE deliberately does not persist investigation results server-side. Browser session data disappears when the page is unloaded. Do not mistake that for anonymity: hosting and upstream providers can record request metadata. Current requests use GET query parameters, which can appear in access logs; avoid entering sensitive information.

## Deployment gate

The default unlisted URL is not authentication. Do not advertise a deployed instance as private. Before wider deployment implement edge rate limits, per-request work budgets, source-level throttling, and protection against scripted abuse. Free-tier limits are not an adequate security boundary.

Collectors must use fixed, vetted upstream hosts. Never fetch arbitrary user-provided URLs from the cloud backend (SSRF risk). Do not bypass logins, paywalls, access controls, robots restrictions, or CAPTCHA challenges.

A public record is not proof that two same-named people are the same person. No private location tracking, payment transaction collection, or bulk private-contact harvesting.

For externally hosted AI, user inputs may be transmitted to the provider. Default to no AI.
