# TaxLounge supervised receipt review — November 2026

## Scope of this build
TaxLounge is a separate UK accounting practice SaaS, not TaxNuvia or Finvessa.

Receipts previously passed through a browser-side workflow that directly created and posted journals using unchecked AI output. The new approach saves a validated **extraction draft**, then a separately authorised human reviewer checks the source, chooses permitted accounts, records a meaningful note and approves a **server-side atomic posting transaction**.

### Completed in code
- Receipt Scanner: upload invokes existing authorised OCR Edge Function and saves a draft; it never inserts journal entries or lines.
- Receipt Review Queue (`/receipt-reviews`): bounded queue of the latest 100 extracted receipts, scoped by authenticated staff tenant/client; source evidence signed links, amounts, review notes, explicit acknowledgment, draft double-entry preview, posted journal references and retry-safe mutation states.
- Back-end `public.post_receipt_review`: checks ledger.edit **and** ocr.approve or firm ownership, tenant/client/doc linkage, GBP, valid receipt date, positive balanced whole-pence values and active tenant-owned expense/bank/VAT control accounts. Uses extraction row locks, unique receipt audit, original source snapshot, event log and idempotent journal reference. It never sends filings or payments.
- `receipt_posting_reviews` RLS permits authorised viewing; direct browser writes are denied. Receipt extraction rows become read-only from the browser; only the authenticated OCR Edge Function writes validated extracts through its separate server-only service role.
- OCR: financial output validation includes currency, amount integrity, correct dates, bounded supplier/item strings and limited model output. Receipt files are persisted only after AI succeeds, so external rate-limit and validation failures do not strand an unreviewable duplicate document.
- Tests cover valid and rejected previews, role/tenant denial, review-note requirements, VAT and bank account mapping, three-line journal balancing, idempotent reposts and direct-write denial.

## Required release gates
1. Clean local migration replay and all pgTAP tests must pass, along with front-end typecheck/build/security audit and Edge Function Deno check.
2. The migration is generated with `supabase migration new` and committed only once passing; no schema was changed on the connected Dishbee Supabase project.
3. Before staging or production, verify the **correct TaxLounge Supabase project**, back up and restore, validate existing orphan/duplicate receipt journals and ensure the historical `RCT-XXXXXXXX` references don't conflict with new audited posting. Verify OCR service-role environment configuration in Edge Secrets and restrict who can deploy.
4. Validate 360px/390px mobile and desktop, an owner/editor/viewer/client-portal matrix and signed-document storage RLS. Test OCR error conditions (AI provider rate-limits, duplicate, invalid output, failed storage, invalid currency).
5. Do not treat OCR confidence as evidence of VAT eligibility, business use or a provider-accepted filing. The accountant is responsible for approving the proposed journal.

## Remaining development
- The historic generic journal-entry and journal-line CRUD policies remain broad. Their security must be hardened in a separate cross-module migration after assessing all accounting pathways; this PR protects the **receipt-review posting path** but doesn't claim to lock down every journal writer.
- Open Banking is still disabled. A server-owned one-time OAuth state/PKCE flow, consent records, encrypted token vault and provider-verified account/client linkage are prerequisites. No automatic import is enabled by this build.
- The existing Lovable AI OCR provider remains the current backend integration; this phase does **not** create a new Omniqora MCP agent, replace provider credentials or automatically incur recurring AI jobs.
- Backfill/audit of historic receipts is a reviewed manual workflow. No silent migration of client data from TaxNuvia or Finvessa.
