# International readiness plan: compliance, billing, mobile app and support tools

> Working with 1–2 developers and a small budget? Follow [LEAN_ROADMAP.md](LEAN_ROADMAP.md) instead. It does the same work in a cheaper order and points back here for details.

**Goal:** sell CodeCortex School ERP as SaaS to schools in Europe and the USA (and keep growing in Pakistan and similar markets), with:

- data-protection compliance: GDPR in the EU/UK; FERPA, COPPA and state student-privacy laws in the US;
- subscription billing;
- a mobile app for parents, students and teachers;
- the support and operations tools a paid product needs.

**Starting point (September 2026):**

- Multi-school isolation, school signup, Google sign-in and a platform console are built and tested.
- Audit logging (`services/core/audit`), backups (`services/core/backup`), feature flags (`services/core/features`) and health checks exist.
- Missing:
  - billing;
  - a mobile app;
  - translations: no i18n library; the UI is English only and assumes Pakistan (Rs, local grading);
  - compliance paperwork and controls;
  - support tools.
- Some screens are unfinished: placeholder export buttons, and 83 places where data lives only in the browser's `localStorage`.
- Hosting is Render's free plan.

> **Legal note.** This plan summarises what the laws generally require, so you can budget and build. It is not legal advice. Have a lawyer in each target market review the contracts, policies and the DPIA before the first sale there.

---

## Order of work and why

| # | Phase | Main outcome | Length* | Can start |
|---|-------|--------------|---------|-----------|
| 0 | Foundations | Finished core screens, production hosting, security review | 6–8 weeks | Now |
| 1 | Billing | Schools can subscribe and pay; limits by plan | 5–6 weeks | After 0 starts (parallel) |
| 2 | Support & operations tools | Help centre, tickets, monitoring, status page, data import | 4–5 weeks | Parallel with 1 |
| 3 | Mobile app | PWA first, then iOS/Android apps | 2 weeks + 10–12 weeks | After 0 |
| 4 | Internationalisation | Languages, currencies, time zones, grading systems | 6–8 weeks | After 0 |
| 5 | Europe (GDPR, UK) | EU hosting, data-subject rights, DPA, DPIA, AI Act review | 8–10 weeks | After 4 |
| 6 | USA (FERPA, COPPA, states) | Student-privacy controls, SSO and rostering, SOC 2 | 10–12 weeks + SOC 2 audit window | After 4, can overlap 5 |
| 7 | Launch & scale | First EU/US pilots, sales material, feedback loop | Ongoing | After 5 / 6 |

\* With a team of 3–4 developers plus part-time design, QA and legal help. Total to a first EU/US pilot: roughly **9–12 months**. SOC 2 Type II adds a 3–6 month observation period on top.

**Why this order:**

1. **Foundations first.** Compliance and app-store reviews will fail on unfinished screens and weak hosting.
2. **Billing and support early.** They let you earn in your current market while the international work continues.
3. **Mobile next.** Parents in every market expect it, and it's a selling point at home too.
4. **Translations (phase 4) before compliance.** GDPR and US readiness both depend on per-country settings (language, data region, legal texts).

---

## Phase 0 — Foundations (6–8 weeks)

**Why:** buyers, app stores and auditors judge the product as it is. Placeholder buttons, browser-only data and free-tier hosting will fail due diligence.

### 0.1 Finish the core product

- [ ] Move the 83 `localStorage` data stores to the server. Keep only UI preferences such as theme and remembered username in the browser. Start with fees, students, employees, attendance and exams.
- [ ] Make every button work or remove it. Examples: "Copy/CSV/Excel/PDF" currently only show a toast, and "Column visibility" does nothing.
- [ ] Fix the known issues in the README:
  - the report card view can show another student when a record is missing;
  - the leave-approval test fails;
  - the finance tests hang;
  - ESLint isn't configured.
- [ ] Make student and employee IDs school-scoped, or auto-generated with the school code (e.g. `GVS-2026-001`). Today they must be unique across all schools.

### 0.2 Security hardening

- [ ] Encrypt the stored first-issue portal passwords (`PortalCredential.initial_password`) at rest. Use a key from a secrets manager. Keep the password only until the user first signs in or changes it.
- [ ] Multi-factor authentication for admins (TOTP). Enforce it for platform superusers.
- [ ] Password policy, account lock-out after failed attempts, a session list with "sign out everywhere", and short-lived access tokens with refresh-token rotation.
- [ ] Rate limits on login, signup, password reset and AI endpoints.
- [ ] Security headers (CSP, HSTS, frame-ancestors). Replace `CORS_ALLOW_ALL_ORIGINS=True` with the real frontend origins.
- [ ] Remove unsafe helper scripts from production images, e.g. `sync_existing_portal_users.py`, which resets everyone to shared passwords.
- [ ] Dependency and container scanning in CI (e.g. `pip-audit`, `npm audit`, Trivy). Code scanning (e.g. GitHub CodeQL).
- [ ] **External penetration test** after these fixes. Budget: **$5,000–20,000**.

### 0.3 Production hosting

- [ ] Move off Render's free plan to a paid cloud with regional choice: AWS, Google Cloud or Azure; Render paid is fine for Pakistan-only.
- [ ] Target layout: managed PostgreSQL with automated backups and point-in-time recovery, managed Redis, object storage for files, a CDN for the frontend, and at least 2 app instances.
- [ ] Encryption in transit (TLS everywhere) and at rest (database, backups, file storage).
- [ ] Infrastructure as code (Terraform), so an EU region and a US region can be stamped out later.
- [ ] Backups:
  - daily, encrypted, and kept in a second region;
  - a **tested restore** each quarter;
  - write down RPO (e.g. 1 hour) and RTO (e.g. 4 hours) in `docs/DISASTER_RECOVERY_PLAN.md`.
- [ ] Staging environment with anonymised data; production data never used for testing.
- [ ] Budget: **$300–1,500 per month** to start, depending on region and load.

**Done when:** no placeholder actions on the main screens; the pen-test findings are fixed; production runs on paid infrastructure with tested restores.

---

## Phase 1 — Billing (5–6 weeks)

### 1.1 Decide how you'll take payments (decision needed first)

A Pakistan-registered company can't open a Stripe account directly. Options:

| Option | How it works | Good for |
|--------|--------------|----------|
| **Merchant of record: Paddle** (or similar) | They sell to the school, handle VAT/sales tax and invoicing worldwide, and pay you out | Fastest route to EU/US without your own foreign company. Fee about 5% + fees per sale |
| **Your own US company (e.g. Delaware LLC via Stripe Atlas) + Stripe Billing + Stripe Tax** | You invoice the schools yourself | Lower fees; needed anyway for many US school contracts; more admin (tax registration, bookkeeping) |
| **Local gateways for Pakistan**: JazzCash, Easypaisa, bank transfer, card via local PSP | Monthly invoice paid locally | Pakistani schools |

**Recommendation:** Paddle (or another merchant of record) for international schools; local gateways plus bank transfer for Pakistan. Move to your own US entity and Stripe once US revenue justifies it. Confirm current country support with each provider before deciding.

### 1.2 Plans and limits

- [ ] Plans (example; set final prices later):

  | Plan | For | Limits | Pakistan | International |
  |------|-----|--------|----------|---------------|
  | Starter | Small schools | Up to 300 students, core modules | Rs 60/student/month | $1.5/student/month |
  | Standard | Most schools | Unlimited students, all modules, parent app | Rs 90/student/month | $3/student/month |
  | Premium | Chains | Standard + AI assistant, SSO, priority support, custom domain | Rs 120/student/month | $5–6/student/month |
  | Enterprise | Districts, trusts, chains | Custom contract, own data region, SLA, on-premise option | Quote | Quote |

- [ ] Annual billing with a discount (e.g. 2 months free). Most schools buy yearly, per academic year.
- [ ] Free trial: 30 days, no card needed. The trial ends in read-only mode, not deletion.
- [ ] Add-ons: AI credits, SMS/WhatsApp message packs, extra storage.

### 1.3 Build

- [ ] Models:
  - `Plan`;
  - `Subscription` (school, plan, status, trial end, renewal date, seats);
  - `Invoice` (for the school's own subscription, separate from student fee invoices);
  - `UsageRecord` (billable students, AI tokens, messages).
- [ ] Usage metering: count active students per school each day, and bill on the monthly peak or average. AI token use is already recorded in `AIUsage`.
- [ ] Enforce plan limits with the existing feature flags (`services/core/features`). Show clear "upgrade" prompts, not errors.
- [ ] Billing page for school admins: plan, next invoice, payment method, invoices to download, change plan, cancel.
- [ ] Payment-provider webhooks: payment succeeded or failed, subscription changed. Verify webhook signatures.
- [ ] Dunning for failed payments: reminders on days 1, 3 and 7. Read-only after 14 days, suspension after 30 (the platform console can already suspend). **Never delete data automatically.**
- [ ] Taxes: EU VAT (with reverse charge for VAT-registered schools), UK VAT, US sales tax. The merchant of record handles these; with Stripe, use Stripe Tax. Collect a VAT or tax ID at checkout.
- [ ] Add revenue to the platform console: MRR, churn, trials, failed payments.

**Done when:** a school can start a trial, subscribe, pay, change plan and cancel without your help; invoices are correct for Pakistan, one EU country and one US state.

---

## Phase 2 — Support and operations tools (4–5 weeks, parallel with Phase 1)

| Area | What to add | Suggested tools (pick one) |
|------|-------------|----------------------------|
| Help centre | Searchable articles and short videos for each module, per role | Intercom Articles, Zendesk Guide, Freshdesk, or HelpScout Docs |
| In-app help | "Help" button, chat and ticket form with the school and user attached; searching articles before creating a ticket | Intercom, Crisp, Freshdesk |
| Ticketing | Priorities, SLAs per plan, canned replies | Same tool as above |
| Onboarding | Guided tours for new admins, building on the setup checklist that already exists | In-house (react-joyride) or the support tool's tours |
| Data import | CSV/Excel templates and an import wizard for students, parents, staff, classes and opening fee balances, with validation and a preview | In-house |
| Data export | Every list exportable to CSV/Excel/PDF; a full export of the school's data (also needed for GDPR, Phase 5) | In-house |
| Transactional email | Password reset, invoices, notices; SPF, DKIM and DMARC set up | Postmark or Amazon SES |
| SMS / WhatsApp | Absence alerts, fee reminders | Twilio; WhatsApp Business API (a service stub already exists) |
| Error tracking | Frontend and backend errors, with user and school context and no personal data in payloads | Sentry |
| Monitoring & logs | Uptime, response times, queue depth, database health, central logs, alerts to on-call | Grafana Cloud or Better Stack; the `monitoring` module already exists |
| Status page | Public uptime and incident notes | Better Stack, Instatus |
| Product analytics | Which features schools use, without tracking children | PostHog (EU hosting or self-hosted); consent needed in the EU for anything non-essential |
| Support access | Staff can view a school's account **only with the school admin's time-limited permission**; every view logged in the audit trail | In-house, using `services/core/audit` |
| CRM | Leads, demos, trials, renewals | HubSpot (free tier) |
| Release notes | "What's new" in the app and by email | In-house or the support tool |
| Public API & webhooks | Documented API keys per school; webhooks for students, attendance and payments | Build on the existing OpenAPI schema (`drf_spectacular`) |

**Done when:** a new school can import its data and get answers without calling you; you are alerted to outages before customers notice; every staff access to a school is permitted and logged.

---

## Phase 3 — Mobile app (PWA: 2 weeks; native apps: 10–12 weeks)

### 3.1 Step 1: installable web app (PWA), about 2 weeks

- [ ] Web app manifest, icons, splash screen, and a service worker that caches the app shell.
- [ ] "Add to home screen" prompt for parents and students.
- [ ] Web push notifications, supported on Android and on iOS 16.4+ for installed web apps.
- [ ] This gets a usable app to Pakistani parents quickly while the native app is built.

### 3.2 Step 2: native iOS and Android apps, 10–12 weeks

- [ ] **Technology:** React Native with Expo. It reuses TypeScript, the API services and the types from the web app, and gives one codebase for both stores. (Wrapping the web app with Capacitor is faster, but app stores increasingly reject thin web wrappers.)
- [ ] **Parents:** children switcher, attendance, fees with in-app payment, results, homework, notices, messages with teachers, and the AI assistant (parent mode).
- [ ] **Students:** timetable, homework, results, notices, AI study helper (when built).
- [ ] **Teachers:** mark attendance **offline** (sync when back online), homework, marks entry, messages.
- [ ] Push notifications through Expo, which uses Firebase Cloud Messaging and Apple Push Notification service. Per-user notification settings.
- [ ] Sign-in:
  - school login;
  - Google;
  - **Sign in with Apple**, which Apple requires if other social logins are offered on iOS;
  - biometric unlock (Face ID or fingerprint) for the stored session. This is a device feature; the app never collects biometric data.
- [ ] **In-app account deletion request.** Apple and Google both require apps with sign-up to offer this. For school-managed accounts, it sends the request to the school admin.
- [ ] Store listings:
  - Apple privacy details ("nutrition labels") and a privacy manifest;
  - the Google Play Data safety form;
  - Google Play Families policy if users may be under 13;
  - do **not** put the app in the Apple Kids category, because it has sign-in and payments;
  - accurate age rating.
- [ ] Build and release pipeline with Expo EAS: test builds for pilot schools, then staged roll-out.
- [ ] Costs: Apple Developer $99/year; Google Play $25 once.

**Done when:** both apps are approved in the stores; teachers can take attendance with no signal; parents receive absence and fee notifications within a minute.

---

## Phase 4 — Internationalisation (6–8 weeks)

- [ ] Add a translation library (`i18next` / `react-i18next` on the web and mobile; Django translations for emails, PDFs and API messages). Move all interface text into translation files.
- [ ] Languages:
  - English (UK and US spelling);
  - Urdu and Arabic, both right-to-left; RTL layout is partly supported already via Settings → Theme → direction;
  - later French, German and Spanish for Europe.
  - Use a translation-management tool (e.g. Crowdin or Lokalise).
- [ ] Per-school settings:
  - country, time zone, currency;
  - date and number formats;
  - first day of week;
  - academic year dates and terms or semesters.
  - Replace hard-coded "Rs" and Pakistan defaults.
- [ ] Grading systems as configurable scales: letter grades and GPA (US), percentages, numeric 1–6 (Germany), 0–20 (France), the UK 9–1 GCSE scale, and Pakistani boards. Report cards follow the chosen scale.
- [ ] Terminology presets per country: "Grade 8 / Year 9 / Class 8", "Homeroom / Form / Section", "Principal / Head teacher".
- [ ] Money in the smallest unit (cents or paisa) with an ISO currency code per school; no floating-point amounts.
- [ ] Legal texts (privacy notice, terms) per country and language.

**Done when:** a school can be set up for Germany, the UK or a US state with the right language, currency, calendar, grading and legal texts, without code changes.

---

## Phase 5 — Europe: GDPR, UK GDPR and the EU AI Act (8–10 weeks)

**Roles:** the school is the **data controller** and you are the **processor** (GDPR Article 28). Your AI providers, email, SMS, hosting and support tools are your **sub-processors**.

### 5.1 Contracts and documents

- [ ] **Data Processing Agreement (DPA)** that every EU/UK school signs (click-through at signup is fine). It covers the Article 28 terms: instructions, confidentiality, security, sub-processors, help with data-subject rights, breach notice, deletion or return at the end, and audits.
- [ ] Public **sub-processor list** with 30 days' notice of changes: hosting, email, SMS, AI providers, Firebase, support and analytics tools.
- [ ] **International transfers:**
  - host EU schools' data in an EU region;
  - where anything leaves the EU (e.g. a US AI provider or support tool), rely on the EU–US Data Privacy Framework for certified US vendors, or on Standard Contractual Clauses plus a transfer risk assessment.
- [ ] **Record of processing activities** (Article 30).
- [ ] **Data Protection Impact Assessment (DPIA)** (Article 35). Needed because the product processes children's data at scale, profiles students (the at-risk predictions), and offers face recognition.
- [ ] **EU representative** (Article 27) and a **UK representative**, because you have no office there. Expect about €1,000–3,000 per year from a representative service.
- [ ] **Data Protection Officer:** likely needed if you process biometric data at scale. Confirm with your lawyer; an outsourced DPO service is fine.
- [ ] Privacy notice templates that schools give to parents; security documentation; the DPIA summary for schools.

### 5.2 Product changes

- [ ] **EU data region.** A separate EU deployment (database, files, backups, logs) selected when the school signs up. The school's region is fixed and shown on the platform console. The Terraform from Phase 0 makes this repeatable.
- [ ] **Data-subject rights tools** for school admins:
  - export a person's data (access and portability, Articles 15 and 20, as JSON and PDF);
  - correct it (Article 16);
  - delete or anonymise it (Article 17), keeping only records the school must legally keep;
  - restrict it (Article 18).
  - Each request is logged with its deadline (one month).
- [ ] **Retention rules** per record type, configurable per school: e.g. attendance kept N years after the student leaves, then anonymised. Automatic clean-up jobs; `services/core/db/archival.py` is a starting point.
- [ ] **End of contract:** full export for the school, then deletion from live systems within 30 days and from backups within the backup window. Written confirmation of deletion.
- [ ] **Privacy by default** (Article 25):
  - minimal fields required;
  - optional fields clearly optional;
  - no marketing emails to students;
  - parent contact details hidden from other parents.
- [ ] **Consent where needed:**
  - for anything not needed to run the school, such as optional photos in public materials or product analytics;
  - a cookie banner **only** if non-essential cookies are used; better not to use them.
- [ ] **Face recognition** is biometric, a special category under Article 9. **Off by default in the EU/UK.** Only after a school-specific DPIA, explicit consent, and an equally easy alternative for students who don't consent. Consider not offering it in Europe at all.
- [ ] **Breach handling:** detection, an internal playbook, and informing the school without undue delay so it can notify its supervisory authority within **72 hours** (Article 33).
- [ ] **Audit log visible to school admins:** who viewed or changed which student's data. The data is already collected by `services/core/audit`.
- [ ] **UK:** the ICO **Children's Code** (Age Appropriate Design Code) applies to services likely to be used by children: high privacy defaults, no nudging, no profiling for commercial purposes.

### 5.3 EU AI Act

- [ ] The AI Act lists some education uses as **high-risk** (Annex III): AI that evaluates learning outcomes, decides access or admission, steers the learning process, or monitors students during tests. Your **at-risk predictions** and **AI help with grading** may fall under this. The obligations are risk management, data governance, human oversight, logging, transparency and registration.
- [ ] The high-risk obligations were due to apply from August 2026. The EU has proposed delaying parts of them. **Check the current dates with your lawyer before launching AI features in the EU.**
- [ ] **Already banned:** emotion recognition in schools (Article 5, since February 2025). Make sure no face or video feature ever infers emotions.
- [ ] Practical steps:
  - AI features switchable per school (off by default in the EU until reviewed);
  - a teacher always confirms AI suggestions (grades, remarks, risk flags);
  - explain why a student was flagged;
  - keep logs;
  - document the models and their limits;
  - tell users when they are chatting with an AI.
- [ ] AI providers: sign their DPAs; use zero-data-retention and EU processing options where available; mask personal data before it's sent (contact details are already masked, `AI_SHARE_CONTACT_INFO`).

### 5.4 Security certification for Europe

- [ ] **ISO/IEC 27001** is the certificate European schools and trusts ask for most. Plan it after SOC 2 (Phase 6) or instead of it if Europe comes first. Many controls overlap.
- [ ] Budget with a compliance platform: roughly **$15,000–40,000** in the first year.

**Done when:** an EU school can sign the DPA, have its data held only in the EU, run a full export and deletion itself, and receive the DPIA and security pack; face recognition and AI are off by default and documented.

---

## Phase 6 — USA: FERPA, COPPA, state laws, SSO and SOC 2 (10–12 weeks, plus the SOC 2 audit window)

### 6.1 Federal laws

- [ ] **FERPA** (student education records). You act as a "school official" under the school's direct control:
  - use records only for the school's purposes;
  - no re-disclosure;
  - support parents' (and eligible students' 18+) rights to **inspect and request corrections**, using the Phase 5 export and correction tools;
  - let schools mark **directory information** and honour opt-outs;
  - log disclosures.
- [ ] **COPPA** (children under 13).
  - Schools may authorise collection for **educational purposes only**, instead of individual parental consent. No advertising, no selling data, no use for other purposes.
  - The FTC's updated COPPA Rule took effect in 2025, with compliance required by April 2026. It adds a written **information security programme** and a **data retention policy**, and tighter limits on sharing. Confirm the details with your lawyer.
- [ ] **PPRA:** any surveys asking students about protected topics need parental notice and consent. Add a flag on survey features.

### 6.2 State student-privacy laws (about 40 states have one)

- [ ] Common rules to build in everywhere:
  - no targeted advertising;
  - no selling student data;
  - no building profiles except for school purposes;
  - reasonable security;
  - delete on request or at contract end;
  - breach notice.
  - This follows California's **SOPIPA**, which many states copied.
- [ ] Sign the **Student Data Privacy Consortium's National Data Privacy Agreement (NDPA)**. Most districts use it, with state-specific addenda.
- [ ] **New York Education Law 2-d:** Parents' Bill of Rights, data privacy agreement, and security aligned with the **NIST Cybersecurity Framework**.
- [ ] **Illinois SOPPA:** a public list of the data you hold, and breach notice within set deadlines.
- [ ] **Biometrics:** Illinois BIPA (written consent, retention schedule, heavy per-violation damages) and similar laws in Texas and Washington. **New York has banned facial recognition in schools.** Face recognition should be **off and unavailable in the US by default**.
- [ ] **California CCPA/CPRA:** mostly covered as a service provider under the school's contract. Keep the service-provider contract terms.

### 6.3 Accessibility (required in US and EU public-sector sales)

- [ ] Meet **WCAG 2.1 AA** on the web and mobile apps:
  - keyboard navigation;
  - screen-reader labels;
  - contrast (the new theme helps);
  - focus states (already added);
  - captions on help videos.
- [ ] Publish a **VPAT / Accessibility Conformance Report**.
- [ ] US: the ADA Title II rule (2024) requires WCAG 2.1 AA for state and local government web content, which covers public schools. Large districts had an April 2026 deadline, smaller ones 2027. Section 508 applies to federal purchases.
- [ ] EU: the **European Accessibility Act** (in force since June 2025) and **EN 301 549** for public procurement.
- [ ] Budget: an external accessibility audit costs **$5,000–15,000**.

### 6.4 US school integrations

- [ ] **Single sign-on:** Google Workspace for Education, Microsoft Entra ID (SAML/OIDC), **Clever** and **ClassLink**. Most US districts use one of the last two.
- [ ] **Rostering:** **OneRoster 1.2** (1EdTech) import and sync of students, classes, teachers and enrolments. **Ed-Fi** for districts that require it.
- [ ] **LTI 1.3**, if the product will launch from or into a learning management system (Canvas, Schoology).
- [ ] US grade levels (K–12), GPA and report card formats; attendance codes by state.

### 6.5 SOC 2

- [ ] US districts and private schools increasingly ask for a **SOC 2 Type II** report.
- [ ] Path:
  1. a compliance platform (Vanta, Drata or Secureframe) to collect evidence;
  2. policies (access control, change management, incident response, vendor management, background checks, security training);
  3. **SOC 2 Type I** (controls designed well at a point in time);
  4. a **3–6 month observation period**;
  5. **SOC 2 Type II**.
- [ ] Budget: platform about $10,000–25,000 a year; auditor about $15,000–40,000.
- [ ] Also prepare answers for standard security questionnaires: **SIG Lite**, **CAIQ**, and **HECVAT** (if selling to universities).

### 6.6 US business set-up

- [ ] US entity (see Phase 1.1) and a US bank account.
- [ ] **Cyber liability and errors-and-omissions insurance.** Many districts require $1–5 million cover. Expect $2,000–10,000 a year to start.
- [ ] A US data region (separate deployment, as for the EU).
- [ ] Contracts: master subscription agreement, NDPA plus state addenda, SLA (e.g. 99.9% uptime with service credits).

**Done when:** a US school can sign the NDPA, sign in through Clever/ClassLink/Google, roster through OneRoster, and receive the SOC 2 report (Type I at first), the VPAT and the security pack; data stays in the US region; face recognition is unavailable.

---

## Phase 7 — Launch and scale (ongoing)

- [ ] **Pilots:** 3–5 schools per new market, at a discount, in exchange for feedback and a reference.
- [ ] **Sales material:**
  - website per market;
  - pricing page;
  - trust centre (security overview, sub-processors, DPA, SOC 2/ISO status, VPAT, status page);
  - demo school (the existing `seed_demo`, localised);
  - case studies.
- [ ] **Customer success:** onboarding call, 30/60/90-day check-ins, product usage alerts (e.g. a school that stops marking attendance).
- [ ] **Keeping compliant:**
  - annual pen test;
  - quarterly access reviews and restore tests;
  - yearly DPIA review;
  - SOC 2/ISO audits;
  - sub-processor reviews;
  - privacy and security training for staff.
- [ ] **On-call and incidents:** rota, runbooks and post-incident reviews shared with affected schools.

---

## Decisions needed before starting

1. **First international market:** the UK/EU or the US. This changes the order of Phases 5 and 6 and whether ISO 27001 or SOC 2 comes first. **Suggestion:** the UK or the Gulf first (English, simpler buying), then the EU, then the US.
2. **How to take payments:** a merchant of record (Paddle) or your own US company with Stripe (Phase 1.1).
3. **Face recognition:** drop it outside Pakistan (recommended), or keep it only with DPIAs and consent.
4. **AI features in the EU:** launch with AI off by default, or wait for the legal review of the AI Act dates.
5. **Mobile:** go straight to React Native (recommended), or PWA only for the first year.
6. **Budget and team:** confirm the team size, which sets the timeline.

## Rough budget for the first year (on top of salaries)

| Item | Estimate (USD) |
|------|----------------|
| Hosting: Pakistan, EU and US regions, staging | 6,000 – 20,000 |
| Penetration tests (2) | 10,000 – 30,000 |
| SOC 2 platform + Type I/II audit | 25,000 – 65,000 |
| ISO 27001 (if Europe first) | 15,000 – 40,000 |
| Legal: DPA, terms, privacy notices, DPIA review, NDPA, US/EU counsel | 8,000 – 25,000 |
| EU + UK representative, outsourced DPO | 3,000 – 12,000 |
| Accessibility audit + VPAT | 5,000 – 15,000 |
| Insurance (cyber + errors and omissions) | 2,000 – 10,000 |
| Support, monitoring, email, analytics tools | 3,000 – 12,000 |
| App stores, translation tools, misc. | 1,000 – 5,000 |
| **Total** | **about 78,000 – 234,000** |

To reduce the early spend:
- Start with **Pakistan + Gulf + UK**: skip SOC 2 and the US region until you have a US pilot.
- Use the free or startup tiers of Vanta/Drata/Sentry/PostHog.
- Delay ISO 27001 until a large European customer asks for it.

---

## Map to this codebase

| Plan item | Where it goes / builds on |
|-----------|---------------------------|
| School isolation, per-school region | `backend/services/core/tenants/` (registry, scoping, binding). Add `School.region` and route signups to the matching deployment |
| Plans and subscriptions | New app `backend/services/core/billing/`; limits via `services/core/features` |
| Usage metering | `AIUsage` (exists); new daily student counts |
| Audit trail for admins and support access | `backend/services/core/audit/` |
| Retention and deletion jobs | `backend/services/core/db/archival.py`, Celery tasks |
| Data export / rights requests | New `backend/services/core/privacy/`; reuses serializers |
| SSO (SAML/OIDC, Clever, ClassLink) | Next to `backend/services/core/accounts/google_identity.py` and `firebase_views.py` |
| OneRoster import | New `backend/services/integrations/oneroster/` |
| Translations | Add `react-i18next` to `frontend/src`; Django locale files in `backend/` |
| Mobile app | New `mobile/` (Expo) sharing types and API clients from `frontend/src/services` |
| Support, help, onboarding | Frontend `components/support/`; builds on `components/dashboard/SetupChecklist.tsx` |
| Monitoring | `backend/services/core/monitoring/`, `health/`; add Sentry to both apps |
