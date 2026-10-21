# Cloudflare launch checklist

This project is deployable as one Cloudflare Worker. It requires no database, KV, R2, queue, AI token, or paid subscription.

## From a checked-out repository

1. Install Node.js 20+ and run `npm install`.
2. Run `npm test` and `npm run check`.
3. Run `npx wrangler login` and authorize the correct Cloudflare account.
4. Run `npm run deploy`. Wrangler prints the assigned workers.dev URL.
5. Visit the URL from an iPhone and desktop browser.
6. Check `/api/health`, then search a known LEI and a domain.
7. Follow a discovered entity, navigate backward, export JSON and HTML, and print to PDF.
8. Check missing records, upstream errors, and mobile Safari behavior.

## Important limitations

- This is an early public-record investigator, **not** a complete nationwide people/property background-check system.
- GLEIF and RDAP sources may rate-limit or reject cloud traffic. Live functionality has not been verified yet.
- The Worker URL is unlisted but publicly accessible. No authentication is enabled.
- Browser state is memory-only. Refreshing the page erases investigation history.
- The source code includes a C++ normalization experiment; it is **not** compiled into the Worker.
- Cloudflare and upstream providers may retain network metadata despite application-level no-store responses.
- Before sharing the URL, configure Cloudflare's available edge rate limiting and abuse protections in your account.
- Do not use personal identifiers that you would not want exposed in provider request URLs or logs; TRACE uses a JSON POST body for its own search API.

## Rollback

Redeploy a previous verified Git commit using Wrangler. The deployment does not require database rollback.
