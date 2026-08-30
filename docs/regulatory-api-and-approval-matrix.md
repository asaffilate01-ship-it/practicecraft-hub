# PracticeCraft regulator API and approval matrix

Last reviewed: 30 August 2026

This is the implementation and registration handover for the UK product. It distinguishes modern REST APIs, Government Gateway XML services, Companies House software filing and portal-only journeys. A local “recognised” record is programme evidence; it does not enable a production connector.

## Accounts and registrations to obtain

| Authority | Registration / credential | Used for | Storage rule |
|---|---|---|---|
| HMRC | Developer Hub organisation and separate sandbox/production applications | VAT MTD, MTD Income Tax, Agent Authorisation and other REST APIs | Client secrets and OAuth tokens are server-only; consent/tokens are client-scoped |
| HMRC | Agent Services Account (ASA) and agency references | Agent journeys and digital authorisation | Store identifiers, never an HMRC password in browser-readable data |
| HMRC | Software Developer registration, 4-digit Vendor ID, test credentials and product recognition packs | RTI, CT600, SA, SA800/SA900, CIS and Gift Aid XML | Filing credentials are server-encrypted; test evidence is non-secret |
| Companies House | Developer account and API key | Public company/officer/PSC/filing-history sync | API key is server-only |
| Companies House | OAuth application | API Filing services currently exposed by Companies House | Client secret and access/refresh tokens are server-only |
| Companies House | Software Filing presenter account, presenter ID/code and credit account where fees apply | XML Gateway forms, formations and iXBRL accounts | Presenter code and company authentication codes are server-encrypted |
| Companies House | Authorised Corporate Service Provider (ACSP) registration | Filing for clients and identity-verification obligations | ACSP number is metadata; identity evidence has restricted retention/access |
| Charity Commission | Developer Hub account, Register of Charities subscription and API key | Public charity lookup/sync | API key is server-only |
| Bank-data provider | Regulated Open Banking provider application, webhook credentials and consent journey | Bank feeds and transaction import | Tokens are encrypted and client-scoped; consent expiry is monitored |

## Filing route by product

| Product | Official route | PracticeCraft state | Production acceptance gate |
|---|---|---|---|
| VAT MTD | HMRC VAT REST API + OAuth 2.0 | Sandbox foundation | Fraud-prevention header test API, full sandbox/error journey, security/accessibility evidence and HMRC production application access |
| MTD Income Tax | HMRC MTD SA REST API family + OAuth 2.0 | Preparation workbench | Current supported API versions, obligations through final declaration, test-support scenarios, fraud headers and production access |
| Agent authorisation | HMRC Agent Authorisation REST API | Not complete | Invitation creation/status/error journey and evidence retention |
| PAYE/RTI | HMRC Government Gateway XML | Live submission blocked | Current tax-year RIM/schema, payroll test data, canonical IRmark, LTS and recognition/Vendor ID evidence |
| Corporation Tax | HMRC Government Gateway XML + accounts/computation iXBRL | Preparation only | Current CT600 calculation/forms, dual iXBRL validation, LTS scenarios and annual HMRC recognition |
| Self Assessment | HMRC Self Assessment Online XML; separate REST APIs may pre-populate data | Preparation only | Current-year SA100 and each supported supplementary form, calculation validation and recognition cases |
| Partnership SA800 / Trust SA900 | HMRC Self Assessment Online XML | Preparation foundations | Separate form-set scope, allocation validation and recognition cases |
| CIS | HMRC CIS Online XML | Preparation foundations | Verification, CIS300/nil/amendment, polling and recognition cases |
| Gift Aid | HMRC Charities Online XML | Claims workbench, no transmission | Current RIM/XML, sample data, test service and Charities Online recognition |
| Companies House public data | Companies House REST API key | Company/officer/PSC sync implemented | Server key, rate/error handling and reconciliation controls |
| Registered office / registered email and supported API forms | Companies House API Filing REST + OAuth 2.0 | Not yet used as filing route | Sandbox transaction and form-specific OAuth scope journey |
| Secretarial forms and formations | Companies House XML Gateway | CS01/AD01/AP01/TM01 test builders; production locked | Presenter account, current schema, form-by-form test acceptance, polling and rejection correction |
| Company and LLP accounts | Companies House XML Gateway + iXBRL | Tagging/workbench only | Current taxonomy, deterministic renderer, visual preview and test-service acceptance for every marketed accounts type |
| Charity public data | Charity Commission Register API | Lookup route only | Developer subscription/API key and reconciliation |
| Charity application / annual return / changes | Charity Commission online services | Controlled manual handoff | Trustee approval, current question set, portal submission and stored external evidence; do not present the public API as a filing API |

## Product controls implemented

- `regulatory_capability_controls` stores accountable owner, programme state, application reference, target/review dates and blockers by tenant.
- `regulatory_readiness_evidence` stores sandbox, schema, fraud-header, security, accessibility and provider-recognition evidence without secrets.
- `production_enabled` is protected by a database trigger and can only be changed by a server-side acceptance workflow with a timestamp and reason.
- Product readiness remains separate from firm evidence so a user cannot relabel an unfinished connector as live.
- Provider filing receipts remain in `submission_jobs` and attempts; readiness evidence is not a substitute for an acceptance response.

## Build order from here

1. Deploy the regulatory control migration and complete four-role persistence/UAT.
2. Finish VAT MTD fraud headers and sandbox scenarios; use this as the first recognised REST filing journey.
3. Build deterministic FRS 105 and FRS 102 Section 1A accounts, visual final-accounts preview and current iXBRL validation.
4. Complete Companies House XML test cases and presenter acceptance for a deliberately narrow first form set.
5. Build current-year RTI, then CT600 with dual iXBRL; do not reuse the existing legacy XML stubs.
6. Add SA100/SA103 first, then SA800/SA900 and MTD Income Tax as separately accepted journeys.
7. Add Charities SORP fund accounting and Charities Online Gift Aid recognition; retain Charity Commission annual return as a portal handoff unless a filing interface is published and granted.

## Official specifications

- [HMRC Developer Hub](https://developer.service.hmrc.gov.uk/api-documentation)
- [HMRC VAT (MTD) API](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/vat-api/1.0)
- [HMRC MTD Income Tax APIs](https://developer.service.hmrc.gov.uk/api-documentation/docs/api?categoryFilters=INCOME_TAX_MTD)
- [HMRC user-restricted OAuth](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints)
- [HMRC fraud-prevention requirements](https://developer.service.hmrc.gov.uk/api-documentation/docs/terms-of-use)
- [HMRC software-development collections](https://www.gov.uk/government/collections/software-development-for-hmrc-detailed-information)
- [Companies House API authorisation](https://developer-specs.company-information.service.gov.uk/guides/authorisation)
- [Companies House API Filing](https://developer-specs.company-information.service.gov.uk/manipulate-company-data-api-filing/guides/overview)
- [Companies House software filing](https://www.gov.uk/guidance/using-software-to-file-your-companys-information)
- [Companies House identity-verification standard](https://www.gov.uk/guidance/how-to-meet-companies-house-identity-verification-standard)
- [Charity Commission Developer Hub](https://api-portal.charitycommission.gov.uk/hub)
- [Charity Commission online services](https://www.gov.uk/guidance/online-services-for-charities)
