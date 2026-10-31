# PracticeCraft / IQ Practice Cloud: design language

**Users:** UK accounting practices, practice owners, accountants, bookkeepers, clients and staff.

**Core workflows:** Client onboarding, AML, jobs and deadlines, bookkeeping, payroll, VAT, accounts, tax filing, document requests and firm operations.

**Brand authority:** Existing src/index.css light UI: muted chalk HSL 80 13% 96%, deep evergreen text HSL 164 19% 11%, olive ring and dark mode blue accents; preserve established task/alert colours.

**Specific trust and usability rules:** Make deadline, filing status, HMRC/Companies House response, approval ownership, audit trail and client confidentiality legible. Never label an unsent submission as filed, and require explicit confirmation of irreversible financial actions.

## Every screen
- Public information: clear value, verified claims, relevant imagery, easy contact and readable mobile navigation.
- Protected SaaS: concise tasks and status, searchable/filterable content, useful empty/loading/error states, explicit action owner and visible success/failure feedback.
- Never change authentication, tenant data scoping, finance/billing states, regulated claims or backend behaviour solely for design. Do not substitute fake customer data in real dashboards.
- Test 360px/390px, 768px, 1440px, 200% zoom, keyboard, visible focus, screen reader, contrast and reduced motion; review critical form recovery paths and long translations.
- Current CSS tokens and components remain the source of visual truth; improve them deliberately, not by cloning a third-party brand.

## Integrated resources
- [Taste Skill](https://github.com/Leonxlnx/taste-skill): `npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend` in supported coding agents to plan distinct layout, art direction, spacing and screenshots.
- [Impeccable](https://github.com/pbakaus/impeccable): `npx impeccable install` for critique/audit/harden/polish. `npx impeccable detect src/` produces an advisory source baseline, not a verified rendered audit.
- [Awesome DESIGN.md](https://github.com/VoltAgent/awesome-design-md): examples for documenting own tokens/patterns only.

## Shipping
Existing lint/build/tests and product-specific user-journey testing are required. Review real mobile and desktop screenshots. Keep PRs unmerged until CI is understood; no Lovable credits or history rewrites.
