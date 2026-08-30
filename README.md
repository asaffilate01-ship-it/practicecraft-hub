# PracticeCraft Hub

PracticeCraft Hub is a UK accountancy-practice platform covering practice management, client and employee portals, accounts preparation, bookkeeping intelligence and regulator-facing workbenches.

## Current release status

The application is a controlled beta. It must not be used for production client data or live regulatory filing until the deployment, tenant-isolation and regulator evidence gates in [`docs/go-live-readiness.md`](docs/go-live-readiness.md) are complete.

The current filing foundations include VAT MTD, selected Companies House secretarial forms, payroll/RTI, Corporation Tax, Self Assessment, MTD Income Tax, charities, Gift Aid, partnerships and LLPs. A visible workbench or generated payload is not evidence of HMRC recognition or Companies House acceptance.

## Local development

Requirements: Node.js 22 and npm.

```sh
cp .env.example .env.local
npm ci
npm run dev
```

Required browser variables are documented in `.env.example`. Server credentials belong in Supabase Edge Function secrets and must never use the `VITE_` prefix.

## Verification

```sh
npm run typecheck
npm run lint:security
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

GitHub Actions runs these checks on pull requests and release branches. The migration job additionally rebuilds a local Supabase database from the complete migration chain.

## Deployment

Use a separate Supabase staging project before production:

1. Apply the migration chain in order.
2. Configure the secrets listed in [`docs/go-live-security-stage.md`](docs/go-live-security-stage.md).
3. Deploy the updated `stripe`, `stripe-webhook`, `portal` and `secretarial` functions.
4. Register the Stripe webhook and retain a signed-event test report.
5. Run the four-role and cross-tenant acceptance matrix.
6. Promote the exact tested commit; do not deploy an untested working tree.

Production switches for HMRC and Companies House remain fail-closed until their corresponding recognition or test-service evidence is complete.
