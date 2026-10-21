# TRACE

**TRACE** is a free, MIT-licensed, stateless, browser-session investigation tool for publicly accessible records.

## Current working scope

- Minimal responsive search UI.
- Real GLEIF Legal Entity Identifier (LEI) public-registry collector.
- Public RDAP domain registration collector.
- OpenAlex research institution directory collector.
- Exact SEC CIK lookup and USAspending federal contract-award keyword search.
- Search by organization name or exact 20-character LEI.
- View source-linked legal entity records and registration details.
- Click a discovered entity to investigate its exact LEI.
- Navigate prior searches retained in browser memory.
- Export the entire session as JSON or HTML, print/save as PDF, or open the native share sheet on supported devices.
- No database, user account, cookie, or persistent server-side investigation storage.
- Explicit source-coverage, errors, and unsupported identifier reporting.

**Not yet implemented:** Georgia Secretary of State collector, nationwide property/court/licensing collectors, C++/WASM processing, interactive relationship graph, streaming updates, and complete abuse controls. TRACE is not a comprehensive background-check service. It must not infer private contact details, private whereabouts, or unverified personal relationships.

## Run locally

Requires Node.js 20+.

```sh
npm install
npm test
npm run dev
```

Open the localhost URL printed by Wrangler.

## Deploy

```sh
npx wrangler login
npm run deploy
```

Deploying requires authorization for your Cloudflare account. Free-tier quotas and upstream service restrictions apply. **The public URL is not access control**: anyone with the address can potentially invoke the API. Do not deploy without considering abuse and resource limits.

## API

`GET /api/health` — health and persistence status.

`POST /api/investigate` with JSON `{ "q": "Example LLC" }` — query the currently supported public sources and return structured findings, source references, per-source outcomes, limitations, and errors. The request body is capped at 2,048 bytes, including streamed bodies without Content-Length.

## Architecture

- Cloudflare Worker serves the browser UI and bounded investigation API.
- Browser memory retains session investigation history.
- Cloud requests are read-only and have an 8-second upstream timeout.
- No permanent server-side storage.
- No AI is used in this initial implementation.
- Future C++ components will be added where profiling demonstrates a benefit.

## Development milestones

1. **Foundation and live vertical slice** — current.
2. More verified business and Georgia public-record collectors.
3. Browser-side entity graph, confidence levels, and improved source provenance.
4. PDF and self-contained HTML export.
5. Concurrency controls, retry policy, observability without query logging, and resource budgets.
6. Optional C++/WebAssembly parsers and optional AI-assisted document interpretation.
7. Nationwide jurisdiction-specific source expansion, integration tests, and production validation.

## License

MIT. See [LICENSE](LICENSE).
