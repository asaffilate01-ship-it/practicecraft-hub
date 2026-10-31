# TaxLounge

**UK accountancy practice management and controlled tax-preparation workflows**

TaxLounge is the product name for the code in `practicecraft-hub`. It is not TaxNuvia or Finvessa. The repository is a React/TypeScript/Vite, shadcn-ui/Tailwind and Supabase application with practice and client/employee workspaces.

## What is already in the code
Practice operations, clients, tasks, bookkeeping, accounts preparation, VAT/MTD workspaces, payroll and preparation reviews, AML, document requests, billing and selected submission/secretarial workflows. **A screen, API handler or queued job is not evidence of live filing acceptance.**

## Local development
1. Install Node.js and run `npm ci`.
2. Copy `.env.example` to your local environment if needed and configure **only** the permitted `VITE_SUPABASE_URL` and publishable/anon key for the intended environment. Never commit secret/service-role keys or provider tokens.
3. Run `npm run dev` for the local workspace.
4. Before proposing changes: `npm run typecheck`, `npm test`, `npm run lint:security`, `npm run build` and `npm audit --omit=dev`.
5. Apply database migrations and deploy Edge Functions only through reviewed, environment-specific staging/release procedures.

## Product and design
- [Product identity and boundaries](PRODUCT.md)
- [TaxLounge design system](DESIGN.md)
- [Modernisation and AI/MCP blueprint](docs/taxlounge-modernisation-2026-10-31.md)
- [SaaS/AI and integration audit](docs/platform-audit-2026-10-05.md)
- [Readiness and release prerequisites](docs/go-live-readiness.md)

## Deployment caution
This repository is **not yet verified production-ready**. Tax logic, sandbox recognition, payment/bank state, tenant tests, migrations, AI scope and hosting must be verified separately. The PWA deliberately does not cache authenticated Supabase API data. The app currently has no verified public marketing domain; do not add a guessed canonical URL.

Lovable may be used to publish after staging and CI review. Do not infer production status from GitHub commits, UI screens or an earlier Lovable project placeholder.
