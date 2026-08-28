# PracticeCraft UK regulatory readiness

Last reviewed: 28 August 2026

PracticeCraft must not describe itself as “HMRC approved”. HMRC uses **recognised software** for products that complete the relevant journey and recognition process. A local status, generated XML, sandbox response or simulated receipt is not a production filing.

> A filing is shown as accepted only when the provider returns an acceptance response retained against an immutable submission job and attempt.

## Delivery sequence

1. **Secure beta and VAT MTD:** deploy migrations/functions, configure server secrets, complete fraud-header and sandbox scenario tests, remove all remaining browser access to credential ciphertext, and complete WCAG/security/incident evidence.
2. **Accounts and Companies House:** implement FRS 105 and FRS 102 Section 1A rules/disclosures, deterministic final accounts, current-taxonomy iXBRL, visual review and form-by-form Companies House gateway testing.
3. **PAYE RTI and Corporation Tax:** replace legacy RTI with the current RIM/IRmark/LTS pack and build CT600 with accounts and computation iXBRL.
4. **Personal tax and wider filings:** implement SA100/SA103 and current-year SA800 first, then MTD ITSA, CIS and separately scoped specialist returns.
5. **Charities and LLPs:** produce SORP accounts and fund disclosures, pass the HMRC Charities Online XML test journey for Gift Aid, retain declarations and claim evidence, prepare Charity Commission annual returns for manual filing, and validate LLP iXBRL/accounts through the Companies House test service.

## Shared filing controls

Every connector requires authenticated caller and server-derived tenant, client ownership checks, encrypted server-only credentials, versioned schemas, blocking preflight, reviewer declaration, stable idempotency, redacted attempt evidence, provider polling, acceptance only from provider evidence, and linked amendments.

AI may extract records, suggest matches, detect duplicates, propose codes/capex and explain exceptions. It must not silently delete duplicates, post material journals, choose estimates, finalise returns, apply declarations or change provider evidence. Deterministic engines calculate tax, validate schemas and generate final filing payloads.

## Official routes

- [HMRC API terms](https://developer.service.hmrc.gov.uk/api-documentation/docs/terms-of-use)
- [VAT MTD guide](https://developer.service.hmrc.gov.uk/guides/vat-mtd-end-to-end-service-guide/)
- [MTD Income Tax guide](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/)
- [HMRC fraud-prevention headers](https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/)
- [RTI specifications](https://www.gov.uk/government/publications/real-time-information-internet-submissions-generic-technical-specifications)
- [Corporation Tax packs](https://www.gov.uk/government/collections/corporation-tax-online-support-for-software-developers)
- [Self Assessment packs](https://www.gov.uk/government/collections/self-assessment-online-support-for-software-developers)
- [HMRC Charities Online XML API](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/xml/Charities%20Online)
- [Charity Commission online services](https://www.gov.uk/guidance/online-services-for-charities)
- [Companies House filing tests](https://www.gov.uk/government/publications/technical-interface-specifications-for-companies-house-software/important-information-for-software-developers-read-first)
