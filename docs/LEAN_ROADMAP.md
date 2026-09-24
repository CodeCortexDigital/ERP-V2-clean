# Lean roadmap: small team, small budget

The full plan (`INTERNATIONAL_READINESS_PLAN.md`) assumes 3–4 developers and $80k+ a year. This is the version for **1–2 developers and a few hundred dollars a month**.

**Main idea: earn first, spend later.**
1. Sell in Pakistan (then the Gulf).
2. Let that revenue pay for the expensive items (European hosting, security audits, native apps, US compliance).
3. Don't start a stage until the previous stage's goal is met.

**Team assumed:**
- **Developer 1:** backend and hosting.
- **Developer 2:** frontend and, later, the mobile app.
- **You:** sales, demos, onboarding and first-line support.
- AI coding assistants to speed up both developers.

---

## Stage 1 — Make it sellable at home (months 1–2)

**Goal:** a school can use fees, students, attendance and exams every day without hitting broken screens.

1. **Finish the four core modules.**
   - Move their browser-only (`localStorage`) data to the server.
   - Make the export buttons (CSV/Excel/PDF) really export.
   - Remove buttons that do nothing.
   - Leave the other modules for later.
2. **Security basics** (cheap, and required before real data):
   - encrypt the stored first-issue portal passwords;
   - two-step login (TOTP) for admins;
   - limit login attempts;
   - set CORS to your real domain only;
   - remove the old password-reset scripts from the server.
3. **Student and employee IDs with the school's code** (e.g. `GVS-2026-001`), so schools never clash.
4. **Paid hosting at the lowest tier** (Render paid plan, about $30–50 a month):
   - daily database backups;
   - **one restore test** before the first paying school.
5. **Free monitoring:**
   - Sentry (free plan) for errors;
   - UptimeRobot or Better Stack (free) for uptime and a status page.
6. **Basic legal:** terms of service and a privacy policy, from a template, checked by a local lawyer (about Rs 50,000–150,000 once).

**Cost:** about $50/month plus the one-off legal fee.
**Move on when:** 2–3 friendly schools have used it daily for 2 weeks with no blocking bugs.

---

## Stage 2 — Charge schools, simply (month 3)

**Goal:** you can bill schools and limit features by plan, without a payment-gateway integration yet.

1. **Plans in the app** (Starter / Standard / Premium), enforced with the existing feature flags, plus a 30-day free trial.
2. **Manual billing first:**
   - the platform console creates a monthly or yearly invoice for each school;
   - the school pays by bank transfer, JazzCash or Easypaisa to your account;
   - you click "mark as paid".
   - Unpaid after 14 days → read-only; after 30 days → suspended. The console can already suspend.
3. **Student data import** from Excel/CSV (students, parents, classes, opening fee balances). This is what makes onboarding a new school take hours, not weeks.
4. **Support, the cheap way:**
   - a WhatsApp Business number;
   - Crisp chat on the website and in the app (free plan);
   - 15–20 help articles with screenshots (GitBook or Notion, free).

**Cost:** nothing extra.
**Move on when:** 5 schools are paying.

---

## Stage 3 — Phone app, cheaply (month 4)

**Goal:** parents and teachers use it on their phones.

1. **Installable web app (PWA):**
   - "Add to home screen";
   - app icon and fast loading;
   - push notifications for absences, fee reminders and notices.
2. **Mobile-first check** of the parent, student and teacher screens: attendance marking, fee view and results on a small phone.
3. **SMS/WhatsApp alerts** as a paid add-on, pay-per-message through a local SMS provider. Pass the cost to schools with a margin.

**Cost:** SMS credit only, recovered from schools.
**Move on when:** most pilot parents have installed it and use it weekly.

---

## Stage 4 — Grow at home (months 5–6)

**Goal:** 20–40 paying schools, less manual work per school.

1. **Automatic payments:** connect a Pakistani payment service (e.g. Safepay or PayFast) for card, JazzCash and Easypaisa, so subscriptions renew themselves. Fee: about 2–3% per payment.
2. **Parents pay school fees in the app** through the same gateway. Schools love this, and you can charge a small fee per transaction.
3. **Help centre filled in**, plus short videos per role.
4. **Referral offer:** one free month for each school a school brings.

**Cost:** gateway fees per payment only.
**Move on when:** monthly revenue covers hosting, tools and at least one developer's salary.

---

## Stage 5 — Ready for other countries (months 7–9)

**Goal:** sell to English-speaking and Gulf schools, and pass a basic privacy check. Paid for by Stage 4 revenue.

1. **Translations and local settings:**
   - add `react-i18next`: English, Urdu, and Arabic (right-to-left);
   - per-school currency, time zone, date format, academic calendar;
   - a letter-grade/GPA scale option.
2. **International billing:**
   - **Paddle**: no monthly fee, about 5% + 50¢ per sale;
   - it handles VAT and sales tax worldwide and pays you out, so you don't need a foreign company yet;
   - check that it supports payouts to Pakistan when you sign up.
3. **Privacy basics most buyers ask for:**
   - a data processing agreement (DPA) that schools accept at signup;
   - a list of the outside services you use (hosting, email, AI provider);
   - "export all our data" and "delete a person's data" buttons for school admins;
   - automatic clean-up of old records;
   - face recognition switched off outside Pakistan.
4. **A low-cost security test:**
   - run OWASP ZAP (free) yourself first;
   - then hire a small firm or freelance tester for about $2,000–5,000;
   - fix what they find.
5. **Check Gulf rules** before the first sale there. The UAE and Saudi Arabia have data-protection laws, and Saudi Arabia may require data to stay in the country for some sectors.

**Cost:** about $2,000–5,000 for the security test, plus the Paddle fee per sale.
**Move on when:** the first 2–3 international schools are paying.

---

## Stage 6 — Real mobile apps (months 10–12)

**Goal:** parent and teacher apps in the App Store and Google Play.

1. **React Native with Expo**, reusing the web app's API code:
   - Parent app first: children, attendance, fees with payment, results, notices, messages.
   - Then the teacher app: attendance that works offline, homework, marks.
2. Required by the stores:
   - Sign in with Apple (if Google sign-in is offered);
   - in-app account deletion request;
   - privacy forms in both stores.

**Cost:** Apple $99/year and Google $25 once. The rest is developer time.

---

## Stage 7 — Europe and the USA (year 2, only when a real buyer is waiting)

Don't build these in advance: they're expensive. Start each one when a school or school group in that market wants to buy, and put part of the cost into their contract.

| When a buyer appears in… | Then do | Rough cost |
|---|---|---|
| **UK / EU** | EU hosting region; data protection impact assessment written with a consultant; EU/UK representative service; UK Children's Code check; AI features off by default until reviewed | $5,000–15,000 + ~$300/month hosting |
| **USA** | Sign the standard US district privacy agreement (NDPA); FERPA/COPPA terms in the contract; US hosting region; single sign-on (Google first, then Clever/ClassLink); accessibility fixes | $5,000–15,000 |
| **A large customer asks for SOC 2 or ISO 27001** | Only then: compliance platform (startup discount) + audit | $20,000+ |

The full plan has the details for each of these (Phases 5 and 6).

---

## What we deliberately postpone

- SOC 2 / ISO 27001 until a buyer requires it.
- EU and US hosting regions until a buyer is signed.
- Native apps until the PWA has users (Stage 6).
- Stripe and a foreign company until US revenue justifies them. Paddle and local gateways cover earlier stages.
- Paid support, CRM and analytics tools. Use the free tiers: Crisp, HubSpot free, Sentry, Better Stack, PostHog.
- Face recognition outside Pakistan (legal risk in the EU and US).
- New AI features, until an AI key is live and schools actually use the assistant.

## Monthly budget by stage

| Stage | Tools & hosting per month | One-off costs |
|---|---|---|
| 1–2 | ~$50 | Rs 50k–150k legal |
| 3–4 | ~$50–100 + SMS (recovered) | none |
| 5 | ~$100 | $2k–5k security test |
| 6 | ~$100 | $124 app store fees |
| 7 | +$300 per region | $5k–15k per market |

## Weekly rhythm (keeps a small team on track)

- **Monday:** pick the week's 3–5 tasks, from the current stage only.
- **Daily:** fix anything a paying school reports before new work.
- **Friday:**
  - deploy to production after the tests pass (backend and browser checks);
  - write a short release note for schools;
  - check backups and errors in Sentry.
- **Monthly:** review stage goals, revenue and support questions; update this roadmap.
