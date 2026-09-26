# Upgrade to International Standard: Progress

**Project:** School ERP, from a Pakistani-style school system to an international-standard, multi-school SaaS platform.
**This document:** what is finished (with details), how deployment stands, and what is planned next (with details).
**Last updated:** 27 September 2026

## Summary

**Completed (all tested and browser-checked)**
- **Phases 1–22**: the core school system (students and households, admissions, fees, attendance, academics, gradebook, communication, calendar, behaviour, student, parent and teacher portals, library, transport, inventory, cafeteria, integrations, reports, search, region styles, privacy and security, navigation).
- **Tier 0, P1–P9**: production readiness: role access, backups, password reset and email, error tracking, the test-and-deploy pipeline and staging, web security, secrets and demo passwords, two-step sign-in, dependency and code scanning.
- **Tier 1, P10–P17**: SaaS readiness: onboarding and import, plans and subscriptions, platform invoices, school export and deletion, privacy and consent, help centre and support tickets, automatic SMS and WhatsApp, retention by record type.
- Fixes after P17: test accounts on the sign-in page, the students class filter, library members.

**Deployment**
- Everything is pushed to GitHub (27 Sep 2026). The live site is not updated yet: the new CI must pass first (see Deployment status). Then the live site is tested.

**Pending**
- Your deployment checklist items (Part B).
- **Tier 2** (P18–P23): installable app and offline attendance, pilot schools, product analytics and status page, accessibility audit, sales CRM, public API and webhooks.
- **Tier 3** (P24–P30): per country, when a school there signs.
- **Tier 4** (P31–P35): native apps, high availability, penetration test, trust centre, ISO 27001 / SOC 2.

## How to read this document

- **Part A — Completed**: every finished phase and item, with what a school can now do, what was built, the tests and the browser check.
- **Part B — Deployment**: the current deployment status and the checklist of things only you can do (accounts, keys, DNS, cron jobs).
- **Part C — Pending**: the future plan in priority order, each item with what to build, why, what it builds on and when.
- **Parts D–F — Reference**: the original 23–84 roadmap, the missing items M1–M20 and the overall sequence.
- ✅ done · ⏳ in progress · ☐ to do.

## Status at a glance

| Group | Items | Status |
| --- | --- | --- |
| Core modules | Phases 1–22 | ✅ Done |
| Tier 0: production readiness | P1–P9 | ✅ Done |
| Tier 1: SaaS readiness | P10–P17 | ✅ Done |
| Deploy and live test | push, CI, Render, live checks | ⏳ In progress (pushed; CI being fixed) |
| Tier 2: growth and daily use | P18–P23 | ☐ Pending |
| Tier 3: new countries | P24–P30 | ☐ Pending (per market) |
| Tier 4: enterprise | P31–P35 | ☐ Pending |

## Contents

- [Part A — Completed](#part-a--completed)
  - [Core school system: Phases 1–22 ✅](#core-school-system-phases-122)
  - [Phase 1: Student & Household Records ✅](#phase-1-student--household-records)
  - [Phase 2: Admissions ✅](#phase-2-admissions)
  - [Phase 3: Fees / Billing ✅](#phase-3-fees--billing)
  - [Phase 4: Attendance ✅](#phase-4-attendance)
  - [Phase 5: Academics / Classes ✅](#phase-5-academics--classes)
  - [Phase 6: Gradebook ✅](#phase-6-gradebook)
  - [Phase 7: Communication ✅](#phase-7-communication)
  - [Phase 8: Calendar & Events ✅](#phase-8-calendar--events)
  - [Phase 9: Behaviour / Discipline ✅](#phase-9-behaviour--discipline)
  - [Phase 10: Student Portal ✅](#phase-10-student-portal)
  - [Phase 11: Parent Portal ✅](#phase-11-parent-portal)
  - [Phase 12: Teacher Workspace ✅](#phase-12-teacher-workspace)
  - [Phase 13: Library ✅](#phase-13-library)
  - [Phase 14: Transport ✅](#phase-14-transport)
  - [Phase 15: Inventory ✅](#phase-15-inventory)
  - [Phase 16: Cafeteria ✅](#phase-16-cafeteria)
  - [Phase 17: Integrations ✅](#phase-17-integrations)
  - [Phase 18: Reports & Analytics ✅](#phase-18-reports--analytics)
  - [Phase 19: Global Search ✅](#phase-19-global-search)
  - [Phase 20: Regionalization ✅](#phase-20-regionalization)
  - [Phase 21: Privacy & Security ✅](#phase-21-privacy--security)
  - [Phase 22: UI/UX & Navigation ✅](#phase-22-uiux--navigation)
  - [Tier 0 and Tier 1: P1–P17 ✅](#tier-0-and-tier-1-p1p17)
  - [P1: Production Readiness ✅](#p1-production-readiness)
  - [P2: Database Safety and Backups ✅](#p2-database-safety-and-backups)
  - [P3: Password Reset and Transactional Email ✅](#p3-password-reset-and-transactional-email)
  - [P4: Error Tracking and Uptime Monitoring ✅](#p4-error-tracking-and-uptime-monitoring)
  - [P5: Test-and-Deploy Pipeline and Staging ✅](#p5-test-and-deploy-pipeline-and-staging)
  - [P6: Web Security Hardening and Rate Limits ✅](#p6-web-security-hardening-and-rate-limits)
  - [P7: Secrets and Default Passwords ✅](#p7-secrets-and-default-passwords)
  - [P8: Two-Step Sign-In for Administrators ✅](#p8-two-step-sign-in-for-administrators)
  - [P9: Dependency and Code Scanning ✅](#p9-dependency-and-code-scanning)
  - [P10: School Onboarding and Data Import ✅](#p10-school-onboarding-and-data-import)
  - [P11: SaaS Plans and Subscriptions ✅](#p11-saas-plans-and-subscriptions)
  - [P12: Platform Payments and Invoices ✅](#p12-platform-payments-and-invoices)
  - [P13: Full School Export and End-of-Contract Deletion ✅](#p13-full-school-export-and-end-of-contract-deletion)
  - [P14: Privacy Documents, Consent and Breach Response ✅](#p14-privacy-documents-consent-and-breach-response)
  - [P15: Help Centre and Support Tickets ✅](#p15-help-centre-and-support-tickets)
  - [P16: Automated SMS and WhatsApp ✅](#p16-automated-sms-and-whatsapp)
  - [P17: Retention by Record Type ✅](#p17-retention-by-record-type)
  - [Fixes and additions after P17 (27 Sep 2026)](#fixes-and-additions-after-p17-27-sep-2026)
- [Part B — Deployment](#part-b--deployment)
  - [Deployment status](#deployment-status)
  - [Deployment checklist](#deployment-checklist)
- [Part C — Pending: Future Upgrade Plan](#part-c--pending-future-upgrade-plan)
  - [Tier 2: Growth and Daily-Use Quality](#tier-2-growth-and-daily-use-quality)
  - [Tier 3: When Entering a New Country](#tier-3-when-entering-a-new-country)
  - [Tier 4: Enterprise Scale and Certification](#tier-4-enterprise-scale-and-certification)
- [Part D — Original Roadmap Reference Table (Phases 23–84)](#part-d--original-roadmap-reference-table-phases-2384)
- [Part E — Missing Items M1–M20](#part-e--missing-items-m1m20)
- [Part F — Final Sequence Overview](#part-f--final-sequence-overview)

# Part A — Completed

## Core school system: Phases 1–22 ✅

---

## Phase 1: Student & Household Records ✅

**Upgrade:** One flat student form with `father_*`, `mother_*`, caste, orphan status, B-Form, family income → **Household-based student management**.

### What a school can now do

- Keep each student in a **household** (family), with the family address, phone and email, and see all children and guardians of a family together.
- Add **any number of guardians** per student (mother, father, step-parents, grandparents, legal guardian, foster parent and others), with phone, email, work details and national ID.
- Set **per-student permissions** for each guardian: primary contact, lives with the student, legal custody, **allowed to pick up**, emergency contact and call order, **receives invoices**, **receives school messages**, parent portal access.
- Record **custody notes** (for example a court order). The student's page shows a warning badge when someone is not allowed to pick up.
- Reuse a guardian who is already on file (for example for a sibling) instead of typing them again. The form suggests matches as you type.
- Keep a **health record**: allergies (with a "severe allergy" warning on the profile), medical conditions, medications, dietary needs, doctor, insurance and consent to emergency treatment.
- Record **immunizations** (vaccine, dose, date, or an exemption with its reason).
- See a **tabbed student page**: Overview, Family & guardians, Health, Attendance (present, absent, tardy, excused), Billing (balance and recent invoices, and who is billed) and Grades.
- Browse and search the **Households** directory (Students → Households) by family, guardian or student name, ID, phone or email, and see each family's total balance.

### Pakistani flow is kept

- The classic student form (father/mother fields, B-Form, caste and so on) still works unchanged.
- Every student saved through it automatically gets a household and guardian records. Siblings are grouped by the father's (or else the mother's) CNIC, the same rule the old family directory used.
- Existing students were converted once when the update was installed (locally: 121 students into 120 households).
- Pakistan-specific fields only appear on the profile when they are filled in.

### Who can do what

- School admins can add and change families, guardians and health records, and see the household directory.
- Teachers, parents and students can view a student's profile only when they are already allowed to see that student. They cannot change it.
- Each school only ever sees its own households and guardians.

### Built

- Backend: `Household`, `Guardian`, `StudentGuardian`, `StudentHealth` and `Immunization` models (migrations `0009` and `0010`, including the one-off conversion) in `backend/services/education/students/`. API in `households.py`, routes in `backend/api/v1/student_urls.py`:
  - `/students/households/`
  - `/students/guardians/`
  - `/students/<id>/profile/`, `/guardians/`, `/health/`, `/immunizations/` and `/household/`
- Frontend: `services/household.service.ts`, a rewritten `StudentProfilePage.tsx` (tabs) and `FamiliesPage.tsx` (Households directory).
- Tests: `backend/tests/test_households.py` has 4 new tests. They cover sibling grouping, guardian/health/immunization management, admin-only changes and isolation between schools. They pass, along with the existing isolation, student, signup and permission tests (63 passed).
- Browser check: opened the households directory and a household, added a guardian with a pickup restriction, saved a severe allergy and an immunization, and opened every tab. No errors.

---

## Phase 2: Admissions ✅

**Upgrade:** Office staff manually enters student application → **Online admissions workflow**.

### What a school can now do

- Turn on **online applications** (Admissions → Online form settings) and share a public link such as `/apply/<school>`. Families apply from a phone or computer with no account.
- The form has five steps:
  1. Student.
  2. Parents and guardians: up to four, each with custody, pickup and billing choices.
  3. Previous school and health: allergies, medical and learning-support needs.
  4. **Document upload**: PDF, JPG or PNG, checked for type and size.
  5. **Review and e-signature**: typed full name, agreement to the declaration and privacy notice, optional photo consent. The time and IP address are recorded.
- The family gets an **application number and tracking code**, by email too, and can **check the status online** at `/apply/status`.
- The school sets: the school year; the welcome text; the list of documents to upload; the declaration families sign; an email address that is told about each new application.
- **Review pipeline** with counts: statuses: New → In review → Accepted / Waitlisted / Declined → Enrolled, plus Withdrawn; search, and a filter by source (online or office).
- Each application has: a decision panel with an optional note, which is emailed to the family for accept, waitlist or decline; interview or assessment date, notes and rating; documents, where staff can upload and remove files; a full **history** of every change and note, and who made it.
- **Enrol in one click**: choose the class and section. This creates the student, their **household, guardians (with permissions) and health notes** from the application, then opens the new student's record.
- **Re-enrolment**: start a campaign ("Returning for 2027–28?") for all current students. Parents see a card in the parent portal and answer Returning, Undecided or Not returning, signing with their name. The office sees live counts, can filter, and can record an answer given by phone. The office can close and reopen the campaign.
- Office staff can still enter walk-in or paper applications through the same form (Admissions → New application).
- **Admissions** is now in the admin menu, translated into all 23 languages.

### Safety

- Only school admins can see or change applications. Before this, any signed-in user could.
- The public form works only when the school has turned it on. It is rate-limited per IP.
- Status can only be checked with both the application number and its secret tracking code.
- Enrolling requires an accepted application and can happen only once.
- Each school only sees its own applications and campaigns. Application numbers are unique across all schools.

### Built

- Backend (`backend/services/education/admissions/`):
  - new fields for international addresses, a guardians list, medical and learning-support needs, source, tracking code, signature and consents;
  - new models `ApplicationDocument`, `ApplicationEvent`, `ReEnrollmentCampaign` and `ReEnrollmentResponse`;
  - migration `0003`, which gives every existing application its own tracking code;
  - `views.py` rewritten; new routes in `urls.py`.
- Frontend:
  - `services/admission.service.ts`
  - `components/admissions/ApplicationForm.tsx`, shared by the public and office forms
  - `pages/public/ApplyPage.tsx`, the public form and status page
  - `pages/education/AdmissionsPage.tsx`, rewritten as the pipeline, re-enrolment and settings
  - `NewApplicationPage.tsx`
  - the re-enrolment card on the parent dashboard
  - an Admissions item in the sidebar
- Tests: `backend/tests/test_admissions.py` has 4 new tests:
  - the form stays closed until the school opens it;
  - the full online flow, from submission through status check, review and enrolment into a household with guardians and health;
  - admin-only access;
  - settings and re-enrolment, including a parent answering and a stranger being refused.
- Passing: these tests, the Phase 1 tests and the isolation tests.
- Browser check:
  - the admin opened admissions;
  - a family applied on a phone-sized screen with two parents, a medical note, a document and a signature;
  - the status page showed "New";
  - the admin started a review, accepted, and enrolled, landing on the student's Family tab with both parents;
  - the admin started re-enrolment for 123 students;
  - the demo parent answered "Returning" for both children and signed.
  - No page errors. The test data was removed afterwards.
- Fixed during testing: the web client strips responses that contain `"success": true`, so the enrol reply came back empty. The admissions endpoints no longer send that key.

---

## Phase 3: Fees / Billing ✅

**Upgrade:** Monthly challans, paid slips, manual fee records, delete fees → **Complete tuition billing system**.

### What a school can now do

- **Family accounts** (Fees → Family Accounts): one billing account per household, covering every child's invoices together. Shows the amount outstanding and any credit held, with search and a filter for families who owe. School-wide totals for outstanding and credit.
- **Family statement** for any date range: lists every invoice, payment, refund and credit, with a running balance; shows who is billed (guardians marked "Receives invoices"); can be printed, or **emailed to the billing parents** with one click.
- **Record a family payment** once: it pays the oldest invoices first, across all the children; anything extra is kept as **account credit**.
- **Account credit**: give credit with a reason (for example a sibling discount or fee waiver); **apply credit** to open invoices; credit from overpayments and refunds is tracked automatically.
- **Refunds** on any payment, up to the amount not yet refunded: back to the original method (card payments are refunded through Stripe automatically), in cash, by bank transfer, or kept as account credit; the invoice reopens by the refunded amount.
- **Payment plans** (Fees → Payment Plans): split an unpaid invoice into 2–24 installments, weekly, every two weeks, monthly or quarterly; the original invoice is closed with a note, so the family is **never billed twice**; save reusable plans such as "Termly: 3 payments".
- **Online payments** (Fees → Online Payments): **Stripe** for cards, Apple Pay and Google Pay in the school's own currency (135+ currencies, including zero-decimal ones like KRW and JPY); **JazzCash / Easypaisa** for Pakistan; step-by-step setup with the webhook address to copy; keys are never shown again after saving.
- **Parents pay online**: the parent dashboard and the student Fees page show a **Family account** card with the amount due, credit and statement; each open invoice has a **Pay online** button that goes to Stripe Checkout and back; the payment is recorded on the invoice automatically when Stripe confirms it.
- **Fee reminders** now go to the guardians marked "Receives invoices", instead of only the student's email.
- The Pakistani flow is kept: monthly challans, paid slips, balance brought forward, JazzCash and Easypaisa all still work.

### Safety and correctness fixes found on the way

- Payment gateway settings, including secret keys, could be read by **any signed-in user**, students too. Now only finance staff can see or change them. Secrets are write-only. Leaving a secret empty when editing keeps the saved one.
- **"Pay online" never worked before**: the payment-detail route caught `/payments/session/` first. The route order is fixed.
- Any signed-in user could start a payment for **any invoice** in the school. Now only invoices the user may see can be paid.
- Payment webhooks ran with no school selected, so confirmations could not find the invoice. Stripe events are now matched to the right school and checked with that school's own webhook secret. Replayed events never pay twice.
- Online payments were always charged in PKR. They now use the school's currency.
- The old "create installments" left the original invoice open, so **families were billed twice**. It is replaced by the payment-plan action above.
- A payment provider could be set up only once across **all** schools. It is now once per school.

### Phase 1 improvement made here

- Children linked to the same parent login are now kept in one household. This covers families without a CNIC on file, for example the demo parent's Ali and Fatima Raza. Migration `students/0011` merged the households that had been split. New siblings join automatically.

### Built

- Backend (`backend/services/education/finance/`):
  - models `AccountCredit` and `Refund`, with `recalculate_invoice()`, which sets paid = payments − refunds;
  - a payment method "account credit", the provider "stripe", and weekly and every-two-weeks plans;
  - migration `0015`;
  - new `billing.py`, which holds accounts, statements, allocation, credit, refunds, payment plans, billing contacts and the API;
  - new `payments/stripe_gateway.py`, for Checkout, signed webhooks and refunds, using Stripe's REST API with no extra package;
  - fixes in `payments/gateways.py`, `views.py`, `serializers.py` and `urls.py`.
- Frontend:
  - `services/billing.service.ts`
  - `pages/education/finance/FamilyBillingPage.tsx`
  - `PaymentPlansPage.tsx`
  - `OnlinePaymentsPage.tsx`
  - `components/finance/FamilyBillingCard.tsx`, on the parent dashboard and the student Fees page
  - three new Fees tabs
- Tests: `backend/tests/test_billing.py` has 7 new tests, covering:
  - a family payment split oldest first, with the extra kept as credit;
  - credit applied to a new invoice;
  - refunds (cash and to credit) and the statement maths;
  - goodwill credit rules;
  - secrets never returned;
  - the Stripe session amount and currency, and a signed webhook that is rejected with a wrong signature, paid with the right one, and not paid twice on replay;
  - a parent unable to pay another family's invoice;
  - a payment plan that does not double-bill;
  - currency minor units.
- `test_households.py` gained the parent-login grouping test.
- Passing: the Phase 1–3 tests, the finance, isolation and permission tests (59 passed in one run), and the household tests.
- Browser check on the demo school:
  - 58 families owing listed;
  - a family payment of the due amount plus 500 paid everything and kept 500 as credit;
  - a 100 refund to credit reopened the invoice by 100, and the statement stayed consistent;
  - Stripe was switched on;
  - a 3-installment plan was created;
  - the demo parent saw their family account and a "Pay online" button, which reached Stripe; the fake test key gave a clear error message.
  - No page errors. The demo database was restored afterwards.

**To take card payments for real**: in Fees → Online Payments, paste the school's Stripe secret key and webhook signing secret. In Stripe, add the webhook address shown on that screen.

---

## Phase 4: Attendance ✅

**Upgrade:** Simple Present/Absent per day → **Advanced attendance management**.

### What a school can now do

- **Attendance codes**, US style: Present; Absent, **excused or unexcused**; **Tardy** with **minutes late**, excused or unexcused; **Early dismissal**; No school.
- Every code can carry a **reason**: illness, medical appointment, family, religious observance, school activity, transport, other.
- **Lesson (period) attendance** (Attendance → Lesson Attendance): teachers pick a class, section and date; the day's lessons come from the timetable, or from the school's periods; they mark Present, Tardy (with minutes), Absent or Excused per student, with a note; a tick shows which lessons are already done; teachers can only take attendance for their own classes, and never for future dates.
- **Two ways to run attendance** (Attendance → Absence Reports → settings): **Once a day** (homeroom register, as before). Lesson marks are extra detail. **Every lesson**. The daily code is worked out automatically: absent from every lesson = Absent; late to the first lesson = Tardy; left partway through = Early dismissal.
- **Automatic family alerts**. Guardians marked "Receives school messages" and linked parent accounts are told by **email and in the parent portal**: when a student is **absent without an excuse**; when a student **arrives late without an excuse** (with the minutes); with a **frequent-absence warning** after a set number of unexcused absences in 30 days (default 3; 0 turns it off). Each alert is sent once. Excused absences never send an alert.
- **Parents report absences** in the parent portal ("Report an absence"): child, absent / arriving late / leaving early, dates, reason and note. They can see whether each report is waiting, approved or declined.
- **The office reviews reports** (Attendance → Absence Reports): "Excuse" marks every school day in the range as excused, with the reason; "Decline" sends a note to the parent; office-entered reports are approved at once.
- **Attendance history** on the student page, which replaces the old 30-day list: the Attendance tab shows a **month calendar** with colour codes (P, T, TE, A, AE, ED); totals for the school year: attendance %, present, absent excused / unexcused, tardy, early dismissal; the family's absence reports and every alert sent, with the addresses it went to; the office can click any school day to change its code, excuse it, or add a reason and note.
- The Pakistani daily register (Attendance → Student Marking) works exactly as before. Absences marked there now also alert the family.

### Fixes found on the way

- The attendance **analytics, patterns, alerts, trends and at-risk** endpoints were never reachable, because the `<id>/` route caught them first. The screens that call them now work.
- The old absence alert ran only when a record was first created, told only linked parent accounts, and sent a WhatsApp to the **student's own phone**. It is replaced by the guardian alerts above.
- Records that were already "Excused" are flagged as excused absences (migration `0009`).

### Built

- Backend (`backend/services/education/attendance/`):
  - new fields on the daily record: excused flag, reason, minutes late, and the early-dismissal code;
  - new models `PeriodAttendance`, `AbsenceReport` and `AttendanceNotice`;
  - new `register.py`, which holds the settings, alerts, lesson roster and save, the daily roll-up, absence reports and review, the office day editor, and the student calendar;
  - alerts fire once the whole change is saved, so an absence entered as excused is never reported as unexcused;
  - `urls.py` reordered.
- Frontend:
  - `services/attendanceRegister.service.ts`
  - `pages/education/attendance/LessonAttendancePage.tsx`
  - `AbsenceReportsPage.tsx`, which includes the settings
  - `components/attendance/AttendanceCalendar.tsx`, on the student page
  - `ReportAbsenceCard.tsx`, on the parent dashboard
  - two new Attendance tabs and a teacher quick action
- Tests: `backend/tests/test_attendance_codes.py` has 4 new tests:
  - an unexcused absence emails the family once, while an excused one sends nothing, and a tardy includes the minutes;
  - the frequent-absence warning;
  - a parent reports, a stranger is refused, the office excuses it, the day is excused with its reason, and the calendar shows it;
  - lesson attendance rolls up to a Tardy day with the minutes, future dates are refused, and outsiders are refused.
- Passing: these tests, the 12 existing attendance tests, and the isolation tests, which now also sweep the newly reachable analytics endpoints (8 passed).
- Browser check on the demo school:
  - the calendar showed 22 school days, and one was set to Tardy (12 min, transport);
  - the lesson screen showed Grade 10's 6 lessons from the timetable, and period 1 was saved for 20 students;
  - the demo parent reported a dentist appointment, and the office excused it;
  - the attendance mode was switched and saved.
  - No page errors. The demo database was restored afterwards.
- Note for local running: the demo backend started by `demo.bat` had to be restarted to pick up the new routes.

---

## Phase 5: Academics / Classes ✅

**Upgrade:** Basic classes and subjects → **Academic structure**.

### What a school can now do

- **School years & terms** (Academic Setup → School Years & Terms): add school years with first and last days, and choose the current year; split a year into **2 semesters, 3 trimesters, 3 terms or 4 quarters** in one click, or add terms by hand; dates are checked: a term must sit inside its year, and terms cannot overlap; the current term is highlighted. The gradebook and report cards in Phase 6 use these grading periods.
- **Grade levels and homeroom teachers** for every class: Pre-K, Kindergarten, Grade 1–12. Grade levels put classes in order and decide promotions. Existing classes were filled in automatically from their names ("Grade 5", "Class 3", "Year 10", "KG", "Nursery").
- **Start a new school year** ("Start this year" on next year's card): a preview shows every student's move, one grade up and keeping their section name where it exists; it shows who **graduates** (the top grade) and who needs attention (no grade level or no next grade); tick students who **repeat the year**; then, in one step: the new year becomes current, students move up, graduates are marked, and enrollment history is written.
- **Course catalog** (Academic Setup → Course Catalog), for every subject: **department**; **level**: Standard, Honors, Advanced, AP, IB, Support; **credits**, for example 1.0 or 0.5; **elective** and **offered this year**. Changes save as you go. Transcripts and GPA (Phase 6) use these.
- **Enrollment history** on the student's Overview tab: every class and section the student has been in, per school year, with dates and how each ended: Enrolled, Promoted, Repeated, Moved, Left, Graduated; it is recorded automatically whenever a student is admitted, moved to another class or section (including the existing Promote Students page), leaves, or rolls over; existing students were given their current enrollment once.
- **Class schedule** on the student's Overview tab: the week's lessons from the timetable (time, subject, teacher, room), opening on today.
- The Pakistani flow is kept: classes are reused every year as before, and the Promote Students page still works (it now also writes history).

### Built

- Backend:
  - `Term` model;
  - grade level and homeroom teacher on classes;
  - course fields on subjects;
  - `Enrollment` model, in the students app;
  - migrations `academics/0025–0026` and `students/0012–0013`, which include the one-off grade-level guess and the enrollment backfill;
  - new `academics/structure.py`: years, terms, term generation, current term, rollover preview and run, student schedule;
  - `students/enrollment.py` plus the pre/post-save signals that keep history in step;
  - the student profile now includes the enrollment history.
- Frontend:
  - `pages/education/academic-years/SchoolYearsPage.tsx`, which replaces the old "coming soon" placeholder;
  - `pages/education/subjects/CourseCatalogPage.tsx`;
  - `components/students/EnrollmentAndSchedule.tsx`;
  - two new Academic Setup tabs.
- Tests: `backend/tests/test_academic_structure.py` has 4 new tests:
  - generated semesters cover the year exactly, out-of-year and overlapping terms are refused, and teachers cannot change them;
  - history follows class changes and leaving;
  - the rollover preview, then a run with one student repeating, one promoted keeping section A, and one graduating, with the new year made current;
  - isolation between schools.
- Browser check on the demo school:
  - the current year was split into semesters, and the current one is marked "Now";
  - a homeroom teacher was set;
  - 2027-2028 was added, and its rollover preview showed 100 students moving up and 20 graduating from Grade 10;
  - a course was set to Science / AP;
  - Iqra Abbasi's Overview showed "Grade 5 · A · 2026-2027 · Enrolled" and her Friday timetable.
  - No page errors. The demo database was restored afterwards.

---

## Phase 6: Gradebook ✅

**Upgrade:** Exam marks → award list → marksheet → **Modern digital gradebook**.

### What a school can now do

- **Gradebook** (new menu item, also a teacher quick action). Choose class and subject, section and term, and get a spreadsheet of students × assignments:
  - type a score and press Tab;
  - shortcuts: **M** = missing (counts as 0), **EX** = excused (not counted), **INC** = incomplete, a number then **L** = late;
  - missing, excused and late cells are coloured;
  - each student's **running grade** (letter, percent, and how many are missing) updates as you type;
  - export to CSV.
- **Weighted categories** per class-subject: one click adds a common set (Homework 20, Quizzes 20, Tests 40, Projects 10, Participation 10), or build your own; the total is shown, and **drop the N lowest** scores per category. If a category has no graded work yet, the weights re-scale over the categories in use.
- **Assignments**: title, category, points, due date, term, for every section or one section, instructions; "counts toward grade" (off for practice work), and "students and parents can see it".
- **Exams feed the gradebook**. "Add an exam" brings an exam from the Examination module in, with its marks, placed in the term that contains the exam date. Marks entered or changed later in Examination stay in sync. The Pakistani exam → award list → marksheet flow keeps working.
- **Grading scales** (Gradebook → Grading Scales): US A–F with plus/minus and GPA points (A 93+ = 4.0 … F), standards levels 4–1, or the school's existing grade scale, which is picked up automatically as the default; edit grades, minimum percents and GPA points; choose the default; set the passing mark.
- **Standards-based grading** (Gradebook → Standards): list the standards for each subject (code + "what the student can do"); rate every student per term: 4 Exceeds, 3 Meets, 2 Approaching, 1 Beginning.
- **Report cards** (Gradebook → Report Cards), for each term: subject grades with category breakdown, standards ratings, **teacher comments** per subject, a **homeroom comment**, attendance for the term, and **unweighted and weighted GPA** (Honors +0.5, AP/IB +1.0, weighted by course credits); preview any student, write comments in place, print; **release to families** per class or for all classes; parents get an in-app notice; "Hide again" undoes a release.
- **Transcripts**: every school year from enrollment history, with each course's term grades, final grade, and credits attempted and earned (credits only for a pass), the year's GPA, **cumulative GPA** and total credits. Printable.
- **Families and students**: a **Grades** card on the parent dashboard and the student Results page shows each subject's current grade, and opens to the published assignments and scores (missing work flagged). Report cards and transcripts are there once released.
- The student page's Grades tab now shows the report card, with staff comments, a term selector and the transcript, above the exam results.

### Safety

- Teachers can only open and grade the classes they teach; admins can open all.
- Only admins change grading scales and release report cards.
- Families only see report cards that have been released, and only published assignments.
- Each school's gradebook is separate. The isolation sweep covers the new list endpoints: 8 passed.

### Built

- Backend: a new app, `backend/services/education/gradebook/`:
  - models `GradingScale`, `GradeBand`, `Category`, `Assignment`, `Score`, `Standard`, `StandardRating`, `ReportComment` and `ReportCardRelease` (migration `0001`);
  - `calc.py`, the grade engine: categories, drop lowest, missing and excused, weighting, letter and GPA bands, credit-weighted GPA;
  - `api.py` and `urls.py`, mounted at `/api/v1/auth/gradebook/`;
  - `signals.py`, the exam-mark sync.
- Frontend:
  - `services/gradebook.service.ts`
  - `pages/education/gradebook/GradebookPage.tsx`, `ReportCardsPage.tsx`, `StandardsPage.tsx` and `GradingScalesPage.tsx`
  - `components/gradebook/ReportCardView.tsx`, which also holds the transcript
  - `components/gradebook/GradesPortalCard.tsx`
  - the Gradebook menu item in 23 languages, a teacher quick action and the module tabs
- Tests: `backend/tests/test_gradebook.py` has 5 new tests:
  - weighted categories with drop-lowest, excused ignored, missing as zero, and re-scaled weights;
  - an exam import placed in the right term, then kept in sync when the mark changes, and refused twice;
  - report card maths, including unweighted and weighted GPA, a standards rating, a comment, release (a parent is refused before release and sees it after), and the transcript with credits;
  - teachers limited to their classes;
  - GPA maths.
- Browser check on the demo school:
  - semesters were created;
  - Grade 5 · Mathematics: the common categories added up to 100%;
  - "Fractions quiz" /20: 18 showed A− (90%), and M showed F with "1 missing";
  - an existing unit test was added from Examination;
  - Ahmed Aslam's report card showed Mathematics A− 90% (Quizzes 90%), GPA 3.7, attendance, and a homeroom comment;
  - Grade 5 was released;
  - the default scale is US A–F;
  - the demo parent's grades card and report cards opened, and correctly said "not released" because their children are not in Grade 5.
  - No page errors. The demo database was restored afterwards.
- Fixed on the way: the report card preview now refreshes right after a release.

---

## Phase 7: Communication ✅

**Upgrade:** Notices and WhatsApp → **Two-way school communication**.

### What a school can now do

- **Messages**: two-way, private conversations for every role (sidebar → Messages; an envelope in the header shows unread messages).
  - **Parents** can write to the office and the teachers of their own children's classes. Each teacher is shown with the child they teach.
  - **Teachers** can write to the office, other teachers, and the parents of students they teach.
  - **The office** can write to every teacher and parent.
  - Students can read and reply in conversations they are part of, but cannot start new ones.
  - A conversation can be about one student.
  - Messages can carry an attachment (PDF, JPG or PNG, checked for type and size).
  - Unread counts appear per conversation and in the header.
  - Every new message also sends an **email and a portal notice** to the others in the conversation.
  - The inbox refreshes itself; Ctrl + Enter sends.
- **Announcements** (sidebar → Announcements). Staff post to: everyone, all parents, all staff, all students, **chosen classes** or **grade levels** (for classes and grades, choose parents and/or students). Delivery: the **portal**, plus **email** (including guardians without a login who are marked "Receives school messages") and **SMS**. The office can **pin** an announcement and **schedule** it for later. The command `send_scheduled_announcements` sends due ones, and they are also sent the next time anyone opens the list. Staff see delivered, read, email and text counts. Teachers can only announce to their own classes; families only see announcements sent to them.
- **SMS that really sends** (Communication → SMS): the school's Twilio account (SID, auth token, sending number, country code for local numbers such as 0300… → +92300…); the auth token is never shown again; send to a list of numbers, with a result per number; every text is logged. The old "SMS Gateway" tab only **pretended** to send ("SMS queued") and is replaced.
- **Communication history** (new tab on the student page): conversations about the student, announcements that reached their family, attendance alerts, and WhatsApp/SMS messages, newest first.
- The existing WhatsApp tools stay as they are. The teacher shortcut to them is renamed "WhatsApp & SMS" so it isn't confused with Messages.

### Fixes found on the way

- There were **no email settings**, so every email tried a mail server on the same computer with no timeout. Email is now configured from `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL` and `EMAIL_TIMEOUT` (15 s). Without a mail server it prints to the console. This also makes fee reminders, attendance alerts, admissions and report-card emails dependable.
- Sending an announcement to the whole school took over a minute and was cut off. Emails and texts now go out **in the background** over one mail connection, so posting is instant (246 recipients in the demo).

### Built

- Backend (`backend/services/education/communication/`):
  - models `Conversation`, `ConversationParticipant`, `ChatMessage`, `Announcement`, `AnnouncementReceipt` and `SmsConfig` (migration `0005`);
  - new `inbox.py`: the contacts rules, conversations, replies, unread counts, announcements with audience targeting and delivery, Twilio SMS, and student history;
  - `urls.py`, mounted at `/api/v1/auth/communication/`;
  - the management command `send_scheduled_announcements`;
  - email settings in `erp_core/settings.py`.
- Frontend:
  - `services/messaging.service.ts`
  - `pages/messages/MessagesPage.tsx`, `AnnouncementsPage.tsx` and `SmsPage.tsx`
  - `components/notifications/MessagesBadge.tsx`
  - `components/students/CommunicationHistory.tsx`
  - sidebar items for every role, translated into 23 languages
- Tests: `backend/tests/test_messaging.py` has 6 new tests:
  - a parent's contacts are only their child's teachers and the office, and writing to someone else is refused;
  - a full conversation with emails, unread counts, a reply, outsiders refused, and history;
  - a class announcement reaches only that class's parents and guardians by portal and email, teachers are limited to their own classes, parents can't announce, and read counts work;
  - a scheduled announcement waits;
  - Twilio SMS: refused until set up, token never returned, local number converted, message logged, and admin only;
  - phone number formats.
- Passing: these tests and the isolation tests (14 passed).
- Browser check on the demo school:
  - the demo parent saw the office and their children's 6 teachers, and wrote to Ayesha Khan;
  - she saw "1 unread" in the header and replied;
  - the parent's inbox showed her reply;
  - an announcement to everyone reached 246 people instantly, and the parent saw it;
  - the SMS page loaded.
  - No page errors. The demo database was restored afterwards.
- **To send real email**: set `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` and `DEFAULT_FROM_EMAIL` on Render (for example your Google Workspace, SendGrid or Mailgun SMTP details).

---

## Phase 8: Calendar & Events ✅

**Upgrade:** Basic notices/date sheet → **School-wide calendar**.

### What a school can now do

- **One school calendar** for every role (sidebar → Calendar), with a month grid and a list view. It brings together:
  - school events, holidays, trips, sports, meetings and deadlines added by staff;
  - **term start and end dates** from School Years;
  - **exams** from Examination (the office sees one entry per exam type per day, e.g. "Unit Test exams (36 papers)"; teachers and families see each paper for their classes);
  - **homework and assignment due dates** from the Gradebook (families only see published ones);
  - **fee due dates** for a family's own children;
  - their own **parent-teacher meetings**.
- **Who sees an event**: everyone, families, staff only, chosen classes, or grade levels. Families only see what is for them and their children's classes. Teachers can add events for their own classes; the office can add anything. Only the person who added an event, or the office, can change or delete it.
- **Holidays close the school**: an event marked "School is closed" (every holiday is) counts as no school, so attendance treats those days like weekends.
- **Reminders**: an event can remind its audience on the day, 1, 2 or 3 days, or a week before, by portal notice and email. Run the command `send_calendar_reminders` once a day.
- **Parent-teacher meetings** (sidebar → Meetings): a teacher offers times for a day (e.g. 15:00–17:00 in 15-minute meetings, with a room or video link), and the same time is never offered twice; families see open times from **their own children's teachers only**, choose the child it's about, add a note, and book; two families can't book the same time; the teacher gets an email when a time is booked; either side can cancel and the other is told; both get a reminder the day before.
- **Add to my phone calendar**: every user gets a private link that Google Calendar, Apple Calendar or Outlook can subscribe to. It shows the same items they see in the app and keeps itself up to date.

### Built

- Backend: new app `backend/services/education/schoolcalendar/` (label `education_calendar`):
  - models `CalendarEvent` and `MeetingSlot` (migration `0001`), registered for school separation;
  - `api.py`: the combined feed, events, meeting times, booking and cancelling, the private iCal link, and reminders;
  - `urls.py`, mounted at `/api/v1/auth/calendar/`;
  - the management command `send_calendar_reminders`;
  - `attendance/calendar.py`: `is_school_day` now respects school closures.
- Frontend:
  - `services/calendar.service.ts`
  - `pages/calendar/CalendarPage.tsx` and `MeetingsPage.tsx`
  - sidebar items Calendar and Meetings for every role, translated into 23 languages
- Tests: `backend/tests/test_calendar.py` has 4 new tests:
  - events reach only the right people, teachers are limited to their classes, and holidays close the school for attendance;
  - the feed includes exams, published assignments, fee due dates and term dates for the right people only;
  - meeting booking from start to finish (offering times, no duplicates, only your child's teachers, double booking refused, email, reminders, cancelling and removing);
  - event reminders go to the right class only, once, and the iCal link works while a tampered link is refused.
- Passing: these tests plus the isolation and attendance tests (26 passed).
- Browser check on the demo school:
  - the admin added a holiday and a science fair;
  - Ayesha Khan offered four meeting times;
  - the demo parent saw both events and booked 15:00 about Fatima Raza;
  - the teacher saw the booking with the parent's note.
  - No page errors. The demo database was restored afterwards.
- **On Render**: add a daily cron job that runs `python manage.py send_calendar_reminders` (next to `send_scheduled_announcements`).

---

## Phase 9: Behaviour / Discipline ✅

**Upgrade:** Affective and psychomotor ratings → **Behaviour management**.

### What a school can now do

- **Behaviour log** (Behaviour & Skills → Behaviour Log, now the first tab): a teacher picks a class, taps one student, several, or "Whole class", chooses a **merit** (adds points) or an **incident** (takes points away), adds a note, and saves once for everyone chosen; each student card shows their running points and incidents; incidents can also have a time, a place, and a "follow up by" date; a record can be kept **staff only** instead of shown to families.
- **Categories and points** (tab "Categories & Awards"): every school starts with 5 merits (Helping others, Excellent work, Participation, Kindness, Leadership) and 10 incident types (Homework not done, Late to class, Disrupting the class, Disrespect, Uniform, Mobile phone misuse, Bullying, Fighting, Cheating, Damage to property). The office can: change points, severity and "tell the family" per category; add categories; retire them (a used category is retired, never deleted).
- **Actions and follow-ups** on each record: verbal or written warning, detention, parent meeting, counselling, loss of privilege, community service, reward, and follow-up notes (staff only); in-school suspension and suspension, which **only the office** can record; start and end dates, a done tick, and an optional message to the family; status moves Open → In review → Resolved.
- **Family alerts**: serious categories (e.g. Disrespect, Bullying, Fighting) tell the family by portal notice and email, including guardians marked "Receives school messages".
- **Positive points and awards**: the school sets milestones (by default Bronze 25, Silver 50, Gold 100 positive points). A student earns each award once, the teacher sees it straight away, and the family is told.
- **Behaviour history**: a new **Behaviour** tab on the student page shows points, merits, incidents (and how many are open), awards, the next award, and the full history with actions; staff can open any record from there; parents and students see the same record in the portal (Behaviour & Skills), with a switch between children. Staff-only records and internal follow-up notes are hidden from them.
- **Behaviour report**: for any date range and class: merits, incidents, open incidents, net points and students involved; counts by category, by class, and incidents by day of the week; top positive points and most incidents; follow-ups due and who is suspended today.
- Teachers see only their own classes (and records they logged); families only their own children.

### Fixes found on the way

- **The existing behaviour data was not kept separate between schools.** Behaviour ratings, skills and observations from one school could be seen and changed by another school, and any signed-in user (including parents) could write to them. Skills and observations now belong to a school (existing rows were moved to the right school, and each school got its own copy of the shared skill list). Ratings go through their student. Families can now only read their own children's ratings and observations, and only staff can change them. The school-separation test now includes behaviour data.
- The sidebar highlighted two items when both linked to the same page with different tabs. Now only the matching one is highlighted.

### Built

- Backend (`backend/services/education/behaviour/`):
  - models `BehaviourCategory`, `BehaviourIncident`, `BehaviourAction`, `BehaviourSettings` and `MilestoneAward`, and a school column on `Skill` and `Observation` (migrations `0003` and `0004` with the backfill);
  - new `discipline.py` and `discipline_urls.py`, mounted at `/api/v1/auth/behaviour/`;
  - `views.py`: families read only; staff write.
- Frontend:
  - `services/discipline.service.ts`
  - `pages/education/behaviour/BehaviourLogPage.tsx`, `BehaviourReportPage.tsx` and `BehaviourSettingsPage.tsx`
  - `components/behaviour/BehaviourHistory.tsx` and `IncidentPanel.tsx`
  - the student page's Behaviour tab, the portal behaviour page, the new tabs, and a teacher shortcut "Behaviour Log"
- Tests: `backend/tests/test_behaviour_discipline.py` has 5 new tests:
  - categories are seeded, only the office changes them, and a used category is retired;
  - a teacher logs for her own class only, group merits work, incidents email the family, staff-only records stay hidden, and points add up;
  - actions, office-only suspensions, family-hidden follow-up notes, the report, and resolving;
  - awards are given once and the family is told;
  - the old behaviour endpoints are read-only for families.
- `test_tenant_isolation.py` now fills behaviour data for both schools.
- Passing: these tests and the isolation tests (13 passed).
- Browser check on the demo school:
  - Ayesha Khan gave "Helping others" to two Grade 6 students, logged "Disrespect" for Fatima Raza, and added a detention (she is not offered suspension);
  - the admin's report, categories page and Fatima's Behaviour tab showed them;
  - the demo parent saw the merit, the incident and the detention in the portal.
  - No page errors. The demo database was restored afterwards.

---

## Phase 10: Student Portal ✅

**Upgrade:** Basic student information/results → **Complete student/family portal**.

### What a school can now do

- **One overview for each student** at the top of the Student Portal and the Parent Portal dashboard. It shows:
  - **alerts** at the top: attendance below 90%, missing work, overdue work, overdue fees, and "the report card is ready";
  - **attendance** for this term (or the last 90 days if no term is set up), with absences, late arrivals and today's mark;
  - **grades** for the current term (average and number of subjects; only published work counts);
  - **work due** in the next two weeks and anything overdue or missing;
  - **fees**: balance, next due date and last payment;
  - **messages**: unread messages and new announcements;
  - **behaviour**: points, merits and incidents (staff-only records stay hidden);
  - **documents**: how many there are and the latest one;
  - **coming up**: the next two weeks of the calendar for that child only (events, exams, due dates, fees, meetings).
  - Every tile opens the full page.
- **Several children**: a parent switches between children with one tap. The choice is remembered, and every portal page follows it.
- **Assignments** (sidebar → Assignments; the old Homework link opens the same page): gradebook assignments and class homework together; status for each piece: Upcoming, Due today, Overdue, Missing, Submitted, Marked or Excused; the mark, the teacher's comment, and homework attachments to download; filters: All, To do, Overdue / missing, Marked, and by subject.
- **Academic progress** (sidebar → Progress): each term's average, attendance, absences, late arrivals, merits and incidents; grades for every subject, term by term; attendance by month for the last six months; a line saying whether the average went up or down on the term before; report cards open from here once the school releases them.
- **Documents** (sidebar → Documents, and a new **Documents** tab on the student page for staff): the office and the student's teachers upload files (reports, certificates, medical notes, letters, consent forms and more) and choose whether the family can see each one; families are told by portal notice when a file is shared with them; families can **send a document to the school** (e.g. a doctor's note): the office and the class teachers are told, and it is marked "From family"; only the office or the person who uploaded a file can remove it; families can't change the school's files; released report cards and issued certificates are listed in the same place; allowed files: PDF up to 5 MB; images, Word and Excel up to 10 MB.
- Families and students only ever see their own children or themselves. Teachers see students in their own classes.

### Built

- Backend:
  - model `StudentDocument` (migration `education_students` `0014`), registered for school separation;
  - new `students/portal.py` and `portal_urls.py`, mounted at `/api/v1/auth/portal/`. They provide the children list, the overview, assignments (with homework attachments), progress, and documents (list, upload, download, share or hide, remove);
  - `schoolcalendar/api.py`: `feed_for` can now show one child's calendar only.
- Frontend:
  - `services/portal.service.ts`;
  - `components/portal/ChildPicker.tsx`, `PortalOverview.tsx` and `DocumentsPanel.tsx`;
  - `pages/portals/student/StudentAssignmentsPage.tsx`, `StudentProgressPage.tsx` and `StudentDocumentsPage.tsx`. The old `StudentHomeworkPage.tsx` was removed;
  - the overview on the student and parent dashboards, and a Documents tab on the staff student page;
  - sidebar items Assignments, Progress and Documents for students, translated into 23 languages.
- Tests: `backend/tests/test_portal.py` has 5 new tests:
  - a parent sees only their children and a student only themself; teachers only their classes;
  - the overview brings attendance, grades, work, fees, alerts and the child's own calendar together;
  - assignment and homework status, marks, comments, hidden drafts, and attachments;
  - progress by term and subject, and report cards only after release;
  - documents: sharing and hiding, family uploads, notices, downloads, file-type checks, and who may change or remove files.
- Passing: these tests plus the calendar, school separation and behaviour tests (22 passed).
- Browser check on the demo school:
  - the admin added a shared letter and a staff-only note to Ali Raza's record;
  - the demo parent saw the overview with its alerts, switched between Ali and Fatima, and opened Assignments and Progress;
  - the parent saw only the shared letter, downloaded it, and sent a doctor's note, which the admin then saw marked "From family";
  - the teacher saw the Documents tab, and the student login showed the new menu items and overview.
  - No page errors. The demo database was restored afterwards.
- Parents got their own menu for these pages in Phase 11.

---

## Phase 11: Parent Portal ✅

**Upgrade:** Limited parent information → **Family/Parent Portal**.

### What a school can now do

- **A menu of their own for parents**, instead of a cut-down office menu: Dashboard, My Family, Attendance, Assignments, Progress, Behaviour & Skills, Fees & Billing, Documents, Applications, Messages, Announcements, Calendar, Meetings and Notifications. It is translated into 23 languages.
- **One account, every child.** Pages that show one child have a switch at the top. The chosen child is remembered from page to page.
- **My Family** (sidebar → My Family):
  - a card for each child with class, today's attendance mark, warnings (low attendance, overdue work, overdue fees, open incidents), attendance, average, work due and balance. Each number opens that child's page;
  - the family's totals: number of children, family balance, work due;
  - the household address and phone, and every parent and guardian with what they may do for each child (main contact, may or may not collect, emergency contact, gets invoices);
  - **Update address** and **Update** for a guardian's details (phones, email, work, address, language).
- **Contact changes go through the office.** A parent's change is **not saved straight away**:
  - the office gets a notice and sees it under Students → **Family Updates**: what is on file now and what the family asked for;
  - **Approve & update** saves it; **Decline** needs no reason but can include a note. Either way the parent is told;
  - the parent sees each request as Waiting for the office, Updated or Declined, with the office's note;
  - custody and pickup permissions can only be changed by the office; unknown fields are ignored; an invalid email is refused.
- **Applications** (sidebar → Applications):
  - every admission application made with the parent's email (as the applicant or one of the guardians), or that became one of their children;
  - the status, each step with its date, the interview date, the decision note sent to the family, and how many documents are on file. Internal staff notes are never shown;
  - the family's re-enrolment answers for every campaign, plus the open re-enrolment card;
  - **Apply for a brother or sister** opens the school's online form when the school has it switched on.
- **Attendance** for each child: the attendance calendar, plus "Report an absence".
- **Fees & Billing**: what each child owes and what is overdue, the family total, and the family account with the statement and "Pay online".
- Assignments, Progress, Documents and Behaviour now have parent addresses (`/parent/...`), and "Dashboard" takes parents back to the Parent Portal.

### Fixes found on the way

- In the Student and Parent portals, "Dashboard" stayed highlighted in the sidebar on every page. Now only the page you are on is highlighted.

### Built

- Backend (`backend/services/education/students/`):
  - model `ContactChangeRequest` (migration `0015`), registered for school separation;
  - new `family.py`: the family page, change requests, the office list and review, and the family's applications. Mounted under `/api/v1/auth/portal/` (`family/`, `family/changes/`, `family/applications/`, `family-updates/`).
- Frontend:
  - `pages/portals/parent/FamilyPage.tsx`, `ParentApplicationsPage.tsx`, `ParentAttendancePage.tsx` and `ParentFeesPage.tsx`;
  - `pages/education/students/FamilyUpdatesPage.tsx` and the Family Updates tab (office only);
  - the parent menu in `Sidebar.tsx`, the `/parent/...` routes, and new functions in `portal.service.ts`.
- Tests: `backend/tests/test_parent_portal.py` has 3 new tests:
  - the family page shows each child's numbers, the household and guardians with their permissions, and nothing from other families;
  - change requests: only real changes are kept, nothing is saved before approval, other families' records are refused, the office approves or declines, and both sides are told;
  - the family's applications, by applicant or guardian email; internal notes hidden; re-enrolment answers; the sibling link only when the online form is open.
- Passing: these tests plus the Phase 10 portal, admissions and school separation tests (20 passed).
- Browser check on the demo school:
  - the demo parent saw the new menu and both children side by side, and asked for a new household address;
  - the admin saw it under Family Updates and approved it, and the parent then saw the new address marked Updated;
  - Fees, Applications, Attendance (switching child), Assignments, Progress, Documents and Behaviour all opened under `/parent`;
  - the parent was kept out of the office page.
  - No page errors. The demo database was restored afterwards.

---

## Phase 12: Teacher Workspace ✅

**Upgrade:** Basic teacher functionality → **Teacher Workspace**.

### What a school can now do

- **My day** at the top of the Teacher Portal dashboard. It shows everything that needs the teacher today:
  - **today's lessons** from the timetable, in order, with room and class. The lesson happening now is highlighted, and each lesson shows whether its register is done (a past lesson without one shows in red);
  - **daily registers** for the teacher's classes: marked out of total, absent and late. Registers still to take come first, the homeroom first among them. "Take register" opens that class's register;
  - **work to mark**: gradebook work that is due or past due and not fully marked (e.g. "Quiz 3 · 1/3"), and homework handed in but not marked yet;
  - **absence notes from parents** for today, for the teacher's classes only;
  - **meetings today** booked by parents, with who, about which child, and their note;
  - **behaviour follow-ups** that are due or overdue;
  - **due this week** (unpublished work is marked "not published"), unread messages, and the next 7 days of the calendar.
- **My Classes** (sidebar → My Classes): a card for each class the teacher teaches, with subjects, number of students, today's register, attendance, class average, missing work, open incidents, and how many students need attention. The homeroom class is marked.
- **Class roster** (open a class): one row per student: attendance, days absent and late, the grade in each of the teacher's subjects, missing work, merits and incidents; a **"needs attention"** flag with the reasons: attendance below 90%, average below 50%, 3 or more missing pieces of work, or 2 or more incidents this term; sort by name, attention, attendance or average; show only students who need attention; each name opens the student's record; buttons open the register, the gradebook and the behaviour log.
- **Class Reports** (sidebar → Class Reports): everyone who needs attention across all the teacher's classes, and why; grades by class and subject: average, highest, lowest and how many of each letter grade; attendance by class: rate, days absent, late arrivals; a print button.
- Teachers see only their own classes. The office sees every class on the same pages. Parents and students are kept out.

### Built

- Backend: new `services/education/academics/workspace.py` and `workspace_urls.py`, mounted at `/api/v1/auth/workspace/` (`today/`, `classes/`, `classes/<id>/`, `report/`).
- Frontend:
  - `services/workspace.service.ts`;
  - `components/teacher/MyDayPanel.tsx` on the teacher dashboard;
  - `pages/portals/teacher/MyClassesPage.tsx`, `ClassRosterPage.tsx` and `ClassReportsPage.tsx`;
  - routes `/teacher/classes`, `/teacher/classes/:id` and `/teacher/reports`;
  - sidebar items My Classes and Class Reports, translated into 23 languages.
- Tests: `backend/tests/test_workspace.py` has 2 new tests:
  - my day: lessons in order with register status, the daily register, work and homework to mark, work due, booked meetings, absence notes and follow-ups (only for the teacher's own classes), and no workspace for parents;
  - classes, roster and report: the attention flags and their reasons (missing work counts as zero in the average), other teachers' classes refused, the office seeing every class, and the grade spread.
- Passing: these tests plus the portal, parent portal, school separation and calendar tests (22 passed).
- Browser check on the demo school:
  - Ayesha Khan saw her six lessons for the day with rooms, her six registers, and nothing left to mark;
  - My Classes showed Grades 5 to 10; the Grade 5 roster (20 students) sorted by attention showed 3 students with low attendance;
  - Class Reports listed 11 students who need attention and attendance for 6 classes;
  - the admin saw all 6 classes, and the demo parent was sent back to the Parent Portal.
  - No page errors. The demo database was restored afterwards.

---

## Phase 13: Library ✅

**Upgrade:** Basic or missing → **Library Management**.

### What a school can now do

- **A library module** (sidebar → Library) with five tabs: Desk, Catalogue, Members, Loans & Reservations, and Report & Rules.
- **Catalogue**: add books with title, authors, ISBN, subject, shelf mark, publisher, year, edition, language and reading level, and say how many copies there are; every copy gets its own barcode (`LIB-000001`, `LIB-000002`, …); search by title, author, ISBN, shelf mark or barcode, and filter by subject; a book's page shows each copy (on the shelf, on loan to whom and until when, held, lost, damaged or withdrawn), the reservation queue and how often it has been borrowed; add copies, mark copies damaged, lost or withdrawn, or put them back on the shelf; a book that was ever borrowed stays in the records (withdraw its copies instead of deleting it).
- **Barcodes and QR codes**: **Print labels** gives a sheet with the title, shelf mark, a barcode and a QR code for each copy. Members get printable **library cards** (`C-000001`) the same way.
- **The desk**: scan a library card (or type a name or student number) to open the borrower, with books out, overdue books, fines and whether they are blocked; scan books to lend them: the due date is set automatically, and a scanner that types the barcode and presses Enter works straight away; scan returned books: late days and any fine are worked out; if someone reserved the book, the desk shows **"Put aside for …"** and that family is told it is ready to collect; renew or return from the borrower's list.
- **Rules** (Report & Rules): loan days and the number of books at a time, separately for students and staff; how many renewals are allowed; how long a reserved book is kept; a fine per day late (0 means no fines); no new loans while a book is overdue. The desk explains every refusal: "already on loan to …", "held for …", "the limit is 3", "has an overdue book", "blocked: …".
- **Members**: every student and staff member can have a card, made the first time they are needed. A member's record shows books on loan, history and fines. The office can **block borrowing** with a reason and print cards for many members at once.
- **Loans & Reservations**: lists: on loan, **overdue**, fines to settle, returned, and the reservation queue; renew, return and **mark lost** (the copy's price becomes the fine); fines are marked paid or waived.
- **Reservations**: when every copy is out, a student, a parent (for any of their children) or a teacher reserves the book and gets a place in the queue. The first returned copy is held for them for the set number of days. If they don't collect it, it goes to the next person or back on the shelf.
- **Reminders** by portal notice and email, to the student and their parents, or to the member of staff: the day before a book is due; every 3 days while it is overdue; when a reserved book is ready. Run the command `send_library_reminders` once a day; it also releases holds nobody collected.
- **In the portals** (Library in the student, parent and teacher menus): search the catalogue (with an "on the shelf now" filter) and reserve; see books on loan with due dates, renew, see and cancel reservations, and see past reading; parents switch between children.
- **Library report**: titles, copies, on loan, overdue, loans and readers in the last 90 days, waiting reservations, fines to collect, the most borrowed books, top readers, loans by subject and by month.
- Each school has its own library. Only the office runs the desk; everyone else only sees their own card.

### Built

- Backend: new app `backend/services/education/library/` (label `education_library`):
  - models `LibrarySettings`, `Book`, `BookCopy`, `Member`, `Loan` and `Reservation` (migration `0001`), all registered for school separation;
  - `api.py` and `urls.py`, mounted at `/api/v1/auth/library/`;
  - the management command `send_library_reminders`;
  - new dependency `segno` (pure Python, no other dependencies) for QR codes. Labels still work without it.
- Frontend:
  - `services/library.service.ts`;
  - `components/library/Barcode.tsx`, a Code 128 barcode drawn in the browser with no extra package, with its own unit tests;
  - `pages/education/library/` (Desk, Catalogue, Members, Loans & Reservations, Report & Rules, Labels);
  - `pages/portals/MyLibraryPage.tsx` for students, parents and teachers;
  - Library in every menu, translated into 23 languages.
- Tests: `backend/tests/test_library.py` has 4 new tests:
  - catalogue and copies: barcodes, search by every field, labels with QR codes, office-only changes, and nothing from another school;
  - issue, return and renew with limits, overdue blocking, fines (paid or waived), lost copies, blocked members, and the report;
  - reservations: the queue, holds for the right person, the family told, collecting, holds expiring, cancelling only your own, and parents acting only for their own children;
  - reminders: due tomorrow once a day, overdue every 3 days.
- Plus `frontend/src/components/library/Barcode.test.ts`: the symbol table, check symbol and widths.
- Passing: these tests plus the school separation, workspace and parent portal tests (17 passed), and the frontend tests.
- Browser check on the demo school:
  - the admin added two books, printed a label (barcode and QR), and lent the only copy of one book to Ali Raza by typing his student number and scanning the barcode;
  - the demo parent saw Ali's loan and reserved the same book for Fatima;
  - when Ali's copy was returned, the desk said "Put aside for Fatima Raza", and the parent saw it ready to collect;
  - the teacher saw her own library card, and the report showed the loans;
  - the parent was kept out of the desk.
  - No page errors. The demo database was restored afterwards.
- **On Render**:
  - `segno` is in `requirements.txt`;
  - add a daily cron job for `python manage.py send_library_reminders`.
- **Still to try**: scanning the printed labels with the school's own barcode scanner.

---

## Phase 14: Transport ✅

**Upgrade:** Basic transport information → **Transport Management**.

### What a school can now do

- **A transport module** (sidebar → Transport) with five tabs: Today, Routes, Students, Fleet & Crew, and Report & Billing.
- **Fleet & crew**: vehicles (name, registration, bus / coaster / van / car, seats, make, and insurance and fitness-certificate expiry dates); drivers and attendants (phone, national ID, and licence number and expiry); anything expiring within 30 days is flagged; a driver or attendant can be given a **login** (for example a teacher who rides as the attendant); they then see **Bus Duty** in their menu.
- **Routes and stops**: each route has a vehicle, driver, attendant, monthly fee and its stops in order, each with a pick-up time (to school) and a drop-off time (home). Stops can be added, renamed and reordered. A stop still used by students can't be removed.
- **Students on transport**: add a student to a route with where they are picked up and dropped off (the same stop unless told otherwise); to and from school, to school only, or home only; a start date, their own fee if different, and a note for the crew; a full vehicle is refused; moving a student to another route or stop replaces their place, so nobody is counted twice; taking a student off a route keeps the history.
- **Today** (office) and **Bus Duty** (crew): every route's morning and afternoon trip: not started, on the way, or completed; how many are on, off and expected; who is absent; and any delay. It refreshes every minute. **Running a trip** (works on a phone): **Start trip**; **Tell families we're late** (minutes and a reason); tick each child **Got on**, **Dropped off** (or **At school** in the morning) or **Not at stop**, tapping again to undo; **Finish trip**. The list is in stop order with the stop time. Children marked absent or with a parent's absence note are shown so the bus doesn't wait. On the way home it shows **who may collect each child**, and in red who may not, using the family's pickup permissions from Phase 1, plus emergency contacts with phone numbers.
- **Family notices** (portal notice to parents, guardians with a login, and the student): "on the way" when the trip starts, and "running about 15 minutes late: Traffic" (one notice per parent, naming their children on that bus); "Sara got on Bus 3 at 07:32 at Main Market", "arrived at school", "was dropped off at Main Market at 14:22", and "was not at the bus stop".
- **Transport in the portal** (student and parent menus → Transport): for each child, the route, vehicle, pick-up and drop-off stops and times, the driver and attendant with tap-to-call phone numbers, whether they are absent today, and today's two trips as they happen.
- **Billing**: "Make invoices" for a month creates a **transport invoice** for every student riding that month, using their route's fee or their own. It never bills a student twice for the same month, and the invoices appear in Fees and the family account like any other.
- **Report**: riders, monthly transport fees, and for the last 30 days trips, delays, average delay and children not at the stop; each route's riders against its seats; and documents about to expire.
- Only the office sets transport up. A route's crew runs only their own route. Families see only their own children. Each school's transport is separate.

### Built

- Backend: new app `backend/services/education/transport/` (label `education_transport`):
  - models `Vehicle`, `TransportStaff`, `Route`, `Stop`, `Rider`, `Trip` and `TripEvent` (migration `0001`), all registered for school separation;
  - `api.py` and `urls.py`, mounted at `/api/v1/auth/transport/`;
  - giving a crew member a login also makes them staff of the school, so they can run their route.
- Frontend:
  - `services/transport.service.ts`;
  - `components/transport/TripRunner.tsx`;
  - `pages/education/transport/` (Today, Routes, Students, Fleet & Crew, Report & Billing);
  - `pages/portals/MyTransportPage.tsx`;
  - Transport in the admin, student and parent menus, and Bus Duty for crew, translated into 23 languages.
- Tests: `backend/tests/test_transport.py` has 3 new tests:
  - setup: expiry warnings, stops in order, riders with their own fee, a full bus refused, moving a rider, stops in use protected, the office-only setup, and the crew seeing only their route;
  - a trip day: the manifest in stop order with who may and may not collect, absences, start / delay / got on / at school / finish, one notice per parent, the families' view, and outsiders and other staff refused;
  - billing and the report: one transport invoice per rider per month, with no double billing.
- Passing: these tests plus the library, school separation and billing tests (24 passed).
- Browser check on the demo school:
  - the admin added Bus 3, a driver, and the demo teacher as the attendant (with her login), then Route 3 with two stops and times, and put Ali and Fatima Raza on it;
  - the teacher saw **Bus Duty**, started the morning trip (the parent was told) and ticked Ali on;
  - the demo parent saw both children's route, stops, times, crew phone numbers and "On the way · Got on 07:xx";
  - the office board showed "1 on · 2 expected", and the report made 2 transport invoices for the month.
  - No page errors. The demo database was restored afterwards.
- **Later**: live GPS tracking of the bus needs a driver app, planned with the mobile apps in phase 42–43.

---

## Phase 15: Inventory ✅

**Upgrade:** Missing/basic → **Inventory Management**.

### What a school can now do

- **An inventory module** (sidebar → Inventory) with four tabs: Stock, Purchases, Suppliers & Categories, and Report.
- **Items**: name, code (automatic `ITM-0001`, or the school's own), unit (pieces, boxes, packs, reams, sets, pairs, kg, litres, metres), category, store room / shelf, and the usual supplier; the **reorder level** (warn at) and the usual order quantity; the cost of one unit, and a **sale price** for things sold to students such as uniforms and books; opening stock when the item is added; search by name, code or shelf, and filter by category or **Low stock**; the stock list shows quantity, reorder level and value, with the total stock value.
- **Stock in and out** (**In / out** on any item): in: received (at a unit cost), returned to store, or a stock count that found more; out: **issued** to a department, classroom or person (required), **sold to a student**, damaged / lost, or a stock count that found less; you can't take out more than is in stock; every change is kept in the item's **history**, with who did it, the balance after, and any reference or note.
- **Average cost**: receiving at a new price updates the item's average cost, so stock value stays right.
- **Selling to students**: choose the student and the quantity; the page shows what the family will be billed. The sale creates an **invoice** on the student's account (e.g. "School shop: 2 × School shirt size 10"), so it appears in Fees, the family account and "Pay online" like any other charge.
- **Low-stock alerts**: when an item falls to its reorder level, the office gets **one** notice ("A4 paper is down to 8 reams, reorder at 10"). It resets once the item is restocked.
- **Purchase orders**: make an order for a supplier with items, quantities and costs; the stages are Draft → **Mark as sent** → **Receive into stock** (all at once, or partly as deliveries arrive) with the supplier's bill number; received goods go into stock at the order's cost; you can't receive more than was ordered, change a sent order's items, or cancel once goods have arrived.
- **Reorder list**: low items grouped by their usual supplier, with a suggested quantity that allows for what's already on order. **Make an order** turns it into a draft purchase order in one click.
- **Suppliers** (contact, phone, email, address, tax number such as NTN or VAT, notes) and **categories**. A supplier with orders is kept and can be marked inactive.
- **Report**: items, stock value, running low, open orders, and sales to students; value by category, the most used items, what was issued to each department, and purchases by supplier, over the last 30 / 90 / 180 / 365 days; the latest stock movements; a **CSV** of the whole stock list for audits and stock counts.
- Only the office manages inventory. Each school's inventory is separate.
- The old "Online Store" page was a browser-only demo: its products and purchases were kept only in the browser and never reached the school's records. Its address now opens Inventory; uniforms and books are sold from real stock there.

### Built

- Backend: new app `backend/services/education/inventory/` (label `education_inventory`):
  - models `Category`, `Supplier`, `Item`, `Movement`, `PurchaseOrder` and `PurchaseLine` (migration `0001`), all registered for school separation;
  - `api.py` and `urls.py`, mounted at `/api/v1/auth/inventory/`. Every stock change goes through one function (`record`), which locks the item, keeps the average cost and sends the low-stock alert.
- Frontend:
  - `services/inventory.service.ts`;
  - `pages/education/inventory/` (Stock, Purchases, Suppliers & Categories, Report);
  - Inventory in the admin menu, translated into 23 languages;
  - `pages/education/OnlineStorePage.tsx` was removed and `/education/store` now opens Inventory.
- Tests: `backend/tests/test_inventory.py` has 3 new tests:
  - items and movements: average cost, issuing needs a recipient, no taking more than there is, one low-stock alert and its reset, the history, duplicate codes, protecting items with history, office only, other schools, and the CSV;
  - selling to a student creates the family's invoice for the right amount;
  - purchase orders: draft → sent → part and full delivery, too much refused, no cancelling after delivery, the reorder list with suggestions, and the report.
- Passing: these tests plus the school separation tests (11 passed).
- Browser check on the demo school:
  - the admin added a supplier, two categories, A4 paper and a school shirt with a sale price;
  - issuing 7 reams to the Science department made the paper **Low stock**;
  - selling 2 shirts to Ali Raza showed "The family is billed $3,000" and created invoice INV-2026-09-0361;
  - **Make an order** from the reorder list produced PO-2026-0001 for 50 reams, which was marked sent and received with bill INV-7788, bringing the paper to 58 reams;
  - the CSV downloaded, and the report showed the stock value, the sale and "Science dept $7,000".
  - No page errors. The demo database was restored afterwards.

---

## Phase 16: Cafeteria ✅

**Upgrade:** Missing → **Cafeteria Management**.

### What a school can now do

- **A cafeteria module** (sidebar → Cafeteria) with three tabs: Till, Menu & Food, and Accounts, Plans & Report.
- **Food and drinks**: name, category (meal, snack, drink, fruit, dessert), price, **allergens** (nuts, milk, egg, gluten, and so on), vegetarian, halal, and on sale or not.
- **Weekly menu**: a grid of breakfast, lunch and snack for Monday–Friday. Click a slot to choose what's served; move between weeks; **Copy to next week**. Families see the week's menu with prices and allergens.
- **Student accounts** (prepaid): each student has a cafeteria balance, opened automatically the first time they are topped up or served. The office sees every balance, what was spent today and each student's meal plan, with a **Low** filter. From a student's account it can add cash, correct a balance (with a reason), pause the account, and refund a purchase.
- **The till** (works on a tablet at the counter): type a name or scan the student number; it shows the **balance**, what's **left of today's limit**, the student's **meal plan** (and whether today's meal was already had), and any **allergies** and dietary needs (in red when severe) from the student's health record; tap food to build the order, then **Charge**, or **Meal plan** for students on one; the sale is refused when there isn't enough money, the daily limit would be passed, the account is paused, or the meal plan meal was already had today; **Allergy check**: if a food's allergens match the student's recorded allergies (e.g. "Peanut cookie: nuts" for a peanut allergy), the till stops with a warning; **Sell anyway** is possible but is written on the transaction; cash top-ups at the till, and a list of sales "just now".
- **Meal plans** (e.g. "Lunch every school day" at a monthly fee): add and remove students. The till serves them without charging, once per day per meal. **Bill the month** makes one invoice per student, never twice for the same month.
- **Families** (Cafeteria in the parent and student menus): each child's balance, spent today against the limit, meal plan, recent purchases and top-ups, and this week's menu. Parents can: **Top up**: this makes an invoice ("Cafeteria top-up for Fatima Raza"); once it's paid (at the office or with **Pay online**), the money is added automatically and the family is told; set a **daily limit** for each child.
- **Low-balance alert**: the family is told once when a balance falls to the school's level, and again only after it has been topped up above it.
- **Rules**: a daily limit for everyone, the low-balance level, and how far below zero a student may go (0 = never).
- **Report**: sales, number of purchases, meal-plan meals, money held in accounts, low balances and balances below zero; best sellers and sales by day.
- Only the office and cafeteria staff (a staff login at the school) use the till. Cafeteria staff see **Cafeteria Till** in their menu. Families only see their own children. Each school's cafeteria is separate.

### Built

- Backend: new app `backend/services/education/cafeteria/` (label `education_cafeteria`):
  - models `CafeteriaSettings`, `FoodItem`, `MenuDay`, `MealPlan`, `MealPlanMember`, `Account`, `Transaction` and `TopUpRequest` (migration `0001`), all registered for school separation;
  - `api.py` and `urls.py`, mounted at `/api/v1/auth/cafeteria/`. Every balance change goes through one function (`post`), which locks the account and handles the low-balance alert;
  - `signals.py` adds a paid top-up invoice's amount to the balance, exactly once.
- Frontend:
  - `services/cafeteria.service.ts`;
  - `pages/education/cafeteria/` (Till, Menu & Food, Accounts, Plans & Report);
  - `pages/portals/MyCafeteriaPage.tsx`;
  - Cafeteria in the admin, parent and student menus, and Cafeteria Till for cafeteria staff, translated into 23 languages.
- Tests: `backend/tests/test_cafeteria.py` has 3 new tests:
  - the till: search, not enough money, charging, the allergy stop and a recorded override, one low-balance notice, the family's daily limit, refunds only once, office-only corrections, paused accounts, and who may use the till;
  - the menu and meal plans: the weekly menu for families, copying a week, joining a plan once, one plan meal a day, no plan refused, billing the month once, and the report;
  - family top-ups: the invoice, the money added when it's paid (and never twice), the family told, and families limited to their own children.
- Passing: these tests plus the billing and school separation tests (18 passed).
- Browser check on the demo school (the demo child Fatima Raza was given a peanut allergy for the test):
  - the admin added three foods, set Monday's lunch, and created a lunch plan for Ali Raza;
  - at the till, Fatima showed "Allergies: Peanuts (severe)"; she was topped up with $500, a peanut cookie was stopped with an allergy warning, and biryani and juice were charged ($310, balance $190);
  - Ali had his lunch on the meal plan;
  - the demo parent saw both children, the purchases and the week's menu, asked for a $1,000 top-up (invoice made, "Waiting for payment") and set a $300 daily limit;
  - the report showed $310 in sales and one meal-plan meal.
  - No page errors. The demo database was restored afterwards.

---

## Phase 17: Integrations ✅

**Upgrade:** Limited integrations → **External integrations**.

### What a school can now do

- **One Integrations page** (sidebar → Integrations, office only) showing every outside service and whether it's on. **Already available**, each with a link to where it's set up: Google sign-in (for every account), calendar feeds for Google / Apple / Outlook (Phase 8), SMS through Twilio (Phase 7), and online payments (Stripe, JazzCash, Easypaisa; Phase 3). Three new connections, described below.
- **Sign in with Microsoft 365 / Entra ID**: the school registers an app in the Microsoft Entra admin centre, following the steps shown (the redirect address has a Copy button), then enters the client ID, directory (tenant) ID, client secret and the school's email domain(s); the login page now has **Continue with Microsoft**: people type their school email, the matching school is found from its domain, and Microsoft asks them to sign in; back in the app they land in their own portal. This works for office staff, teachers, students and parents who already have an account at that school with the same email; nobody gets a new account this way; the app checks that the reply is for the school's own app, was made for this sign-in, hasn't expired, and comes from the school's directory; a school address with no account here is told to ask the office; two schools can't claim the same email domain.
- **Google Classroom** (read only): the school connects its Google account once (**Connect Google Classroom**) and sees its active courses; link each course to a class here; **Compare rosters** shows, by email, who is in both, who is only in Classroom (and which class they're in here, or "not a student here"), and who is only in the class (including students with no email on record), plus the Classroom teachers; nothing is changed in Classroom.
- **School email**: send the school's notices, reminders and receipts from its **own address and mail server** (Google Workspace, Microsoft 365, SendGrid, Mailgun or any SMTP server), with the school's name as the sender; **Send test** shows the mail server's answer (for example a wrong password or unknown server), and the last problem is kept on the card; schools without their own server keep using the system's email.
- **Secrets are safe**: client secrets, email passwords and Google access are **stored encrypted**; they're never shown again ("saved; leave blank to keep"); **Turn off and forget** or **Disconnect** wipes them.
- **Sign-in can only return to the school app**: the addresses it may send people back to are on a fixed list (`FRONTEND_ORIGINS`, plus localhost while developing), so a sign-in can't be redirected to another site. The one-time sign-in code works once, within 2 minutes.

### Fixes found on the way

- **Staff who are not teachers could not sign in at all.** An account whose only link to the school is a staff or accountant membership (bus attendants from Phase 14, cafeteria cashiers from Phase 16, office helpers) was refused with "not assigned to a valid portal role". Such accounts now get the **staff** role; parent, teacher, student and admin still come first.

### Built

- Backend: new app `backend/services/education/integrations/` (label `education_integrations`):
  - models `Integration` and `ClassroomLink` (migration `0001`), registered for school separation;
  - `secrets.py`: Fernet encryption with a key derived from `SECRET_KEY`;
  - `email_backend.py`: the system email backend now picks the current school's own mail server when it has one, and otherwise falls back to the old setting (`FALLBACK_EMAIL_BACKEND`);
  - `api.py` and `urls.py`, mounted at `/api/v1/auth/integrations/`: the hub, settings, test email, Microsoft start / callback / one-time code exchange, and Google Classroom connect / callback / courses / link / compare;
  - new settings `FRONTEND_ORIGINS` and `PUBLIC_API_URL`;
  - `accounts/decorators.py`: the staff role.
- Frontend:
  - `services/integrations.service.ts` and `pages/settings/IntegrationsPage.tsx`;
  - the login page's **Continue with Microsoft** and its return, via `ssoLogin` in the auth store;
  - Integrations in the admin menu;
  - new sign-in text in 23 languages.
- Tests (Microsoft, Google and the mail server replaced with fakes):
  - `backend/tests/test_integrations.py` has 4 new tests:
    - the hub and settings: secrets never returned, encrypted at rest, kept when left blank, and wiped on disconnect; Microsoft's required fields; domain clashes between schools; office only;
    - school email: the school's server, port, security and sender; mail inside the school goes through it and other mail uses the default; the test button reports the server's error;
    - Microsoft sign-in: unknown domains and foreign addresses refused; the handoff with the school's app and the email hint; replies for another sign-in or organisation, and tampered links, refused; sign-in and a one-use code; people with no account at this school refused; students allowed;
    - Google Classroom: connecting (long-term access kept encrypted), courses across pages, linking, and the roster comparison.
  - `backend/tests/test_staff_role.py` has 1 new test: staff and accountant memberships give the staff role; inactive memberships don't; other roles win.
- Passing: these tests plus auth, permissions, school separation, transport and cafeteria (55 passed).
- Browser check on the demo school (fake Microsoft and Google app details; the handoff to Microsoft and Google was intercepted):
  - the admin opened Integrations, saw what's already available, and turned on Microsoft sign-in for `code.com` (the secret showed as "saved");
  - school email with a made-up server was saved, and **Send test** reported the server couldn't be found;
  - **Connect Google Classroom** handed over to Google asking for 3 read-only permissions with long-term access;
  - on the login page, **Continue with Microsoft** refused a gmail.com address and handed `parent@code.com` to Microsoft with the school's app and the email filled in;
  - returning with an error showed it (and cleaned up the address bar), and an old code showed "This sign-in has expired".
  - No page errors. The demo database was restored afterwards.
- **Not in this phase**: Microsoft Teams or OneDrive, pushing grades back to Classroom, and district SSO (Clever / ClassLink) and rostering (OneRoster). They're on the later roadmap (72–77).

---

## Phase 18: Reports & Analytics ✅

**Upgrade:** Basic reports → **Advanced analytics dashboard**.

### What a school can now do

- **Six new school reports**, the first tabs under Reports (the sidebar's Reports now opens them for the office): Overview, Enrolment, Attendance Trends, Finance, Academics and Teachers. The existing report tabs are still there.
- **One date range at the top** applies to everything below it: Last 30 days, Last 90 days, This year so far, Last 12 months, or any two dates. Changing it keeps the charts on screen, dimmed, until the new numbers arrive.
- **Every number is compared** with the period of the same length just before, shown as a change in green or red with an arrow (for example "−0.3 pts vs previous period").
- **Overview**: students on roll, new students, attendance, fees collected, collection rate (collected ÷ billed), overdue fees (and all that's owed), and behaviour incidents; charts: fees billed and collected by month, attendance by month, students on roll by month, and attendance by class.
- **Enrolment**: on roll, joined and left in the period, and the share of applications that enrolled; students on roll month by month for a year, joiners and leavers by month, students by class, the admissions funnel (applied → accepted → enrolled), and gender.
- **Attendance Trends**: the rate with its change, days absent (and excused), late arrivals, and how many students are often absent (below 90% with 10+ days recorded); the rate by month, by class (lowest first) and by day of the week, and a list of the students often absent, each linking to their record.
- **Finance**: billed, collected, collection rate, owed now and overdue; billed vs collected for 12 months; **what's owed, by how late** (not due, 1–30, 31–60, 61–90, over 90 days); billed by fee type (tuition, transport, …) and how families paid; the students who owe the most; income and expenses for the period (fees collected, other income, expenses from the ledger, net). "Billed" counts only this period's charges, not balances brought forward, so nothing is counted twice; refunds are taken off what was collected.
- **Academics** (current term): average by class and by subject (lowest first), the spread of letter grades, and every student who needs attention with the reason (the same rules as the teacher workspace).
- **Teachers**: each teacher's classes, students, lessons a week, work due in the period, how much of it is marked, behaviour records logged, and their classes' attendance.
- **Charts are easy to read and check**: hovering or keyboard focus shows the exact values; every chart has **Show table**; two-series charts have a legend; the colours were checked for colour-blind readers and contrast, in light and dark mode.
- **CSV** of each report's main table (enrolment by month, students often absent, billed vs collected by month, averages by class, teachers).
- Office only. Every figure is for the signed-in school only.

### Fixes found on the way

- The teacher's "My day" (Phase 12) could show the wrong day's lessons around midnight, because the day was read from the clock differently from the rest of the app. It now uses the school's local date everywhere.

### Built

- Backend: new app `backend/services/education/insights/` (label `education_insights`, no tables). `api.py` and `urls.py`, mounted at `/api/v1/auth/insights/` (`overview`, `enrolment`, `attendance`, `finance`, `academics`, `teachers`); each takes `?from=&to=` and `?export=csv`.
- Frontend:
  - `components/insights/Charts.tsx`: small SVG charts with no extra package (column, line, bar list and stat tile), each with hover, a table view, and light and dark colours;
  - `pages/education/insights/SchoolReportsPage.tsx`;
  - the new tabs in `moduleTabs.ts` and their routes.
- Tests: `backend/tests/test_insights.py` has 3 new tests (exact numbers on a small school, plus another school's data that must never appear):
  - the overview and enrolment, including a CSV, and office only;
  - attendance: counts, by class, students often absent, and a custom date range; finance: billed, collected (after a refund), owed, overdue and by how late, by fee type and method, the ledger, and the list of who owes the most;
  - academics and teachers.
- Passing: these tests plus the school separation and teacher workspace tests.
- Browser check on the demo school (read only):
  - the Overview showed 120 students on roll, 94.4% attendance, $2M collected at a 71.2% collection rate and $821.5K overdue, with the four charts;
  - the column and line tooltips showed "Sep $2.9M Billed · $2M Collected" and "Aug 95%";
  - **Show table** listed 12 months;
  - all five other reports loaded (e.g. 11 students often absent; owed by how late; the teachers' table), and the Teachers CSV downloaded;
  - dark mode was checked.
  - No page errors.

---

## Phase 19: Global Search ✅

**Upgrade:** Search within individual modules → **Global search**.

### What a school can now do

- **Search from anywhere**: a **Search** button in the top bar, or press **Ctrl K** (⌘ K on a Mac) or **/**, opens one search box over any page. Type 2 or more letters to see results grouped by kind, best match first (exact, then starts with, then contains); **↑ ↓** moves, **Enter** opens, **Esc** closes; recent searches are remembered on the device; **See all results** opens a full results page with a filter for each kind of record.
- **What the office can find**: students, by name, student number, email, phone or father's name; parents & guardians, by name, email, phone or ID (a result opens the child's Family tab); staff, by name, employee number, email or phone; classes (a result opens the class roster); **invoices** by number or student (a result opens the invoice list filtered to it); **applications** by number, name or email (a result opens that application); library books by title, author, ISBN or **copy barcode**; transport routes and vehicles (including registration numbers); inventory items (by name or code) and suppliers.
- **Pages too**: typing "collect", "absence", "report cards", "bus" or "top up" offers the matching page ("Go to"), different for each role.
- **Everyone sees only what they may**: teachers find only the students and classes they teach, plus the library; parents find only their own children and the library (which opens their library page); students find themselves and the library; nobody sees another school's records.

### Fixes found on the way

- **The old search showed every student to anyone signed in**, including parents and students, with names and phone numbers, and it was only reachable through an unused component with a broken address. It has been replaced by the search above, which checks the person's role.
- The invoice list's search now also matches invoice numbers.
- The library catalogue, the portal library, the inventory stock list and admissions now open on a search or record passed in the address (`?q=` / `?open=`), so search results land in the right place.

### Built

- Backend: `backend/services/core/search/views.py` rewritten (still `/api/v1/search/?q=`, plus `&type=` and `&limit=`). It groups results, ranks them, gives each the address that opens it, and limits everything by role. It works the same on SQLite and Postgres.
- Frontend:
  - `services/search.service.ts` rewritten;
  - `components/search/CommandPalette.tsx` (the search box and its keyboard shortcuts);
  - `pages/SearchPage.tsx` (`/search`);
  - `config/searchPages.ts` (the pages each role can jump to);
  - a Search button in `Header.tsx`;
  - the old unused `components/SearchBar.tsx` was removed.
- Tests: `backend/tests/test_global_search.py` has 2 new tests:
  - the office finds every kind of record, ranked; exact codes come first (student number, invoice number, barcode, item code, phone); one kind at a time; short searches return nothing; another school never appears;
  - teachers see only their class's students and classes; parents only their own child (with their own page addresses and no other family's phone numbers); people with no role find nothing.
- Passing: these tests plus the school separation and permissions tests (36 passed), and the frontend tests.
- Browser check on the demo school (read only):
  - Ctrl K and "raza" showed students, parents & guardians and invoices, and **Enter** opened the first student;
  - typing an invoice number and pressing **Enter** opened the invoice list showing just that invoice;
  - "collect" offered "Collect fees"; **/** opened the box and **Esc** closed it;
  - **See all results** for "ali" showed Students 21, Parents & guardians 17, Staff 1 and Invoices 30;
  - the demo parent's "ali" found only their own child Ali Raza, and the teacher found 5 students in her classes and no invoices.
  - No page errors.

---

## Phase 20: Regionalization ✅

**Upgrade:** Pakistani terminology everywhere → **Region Style System**.

### What a school can now do

- **Choose a region style** in **Settings → Language & currency → Region style**: **Pakistan**, **International**, **United Kingdom** or **United States**. A preview shows the wording before saving; when switching, the school can also switch its currency and time zone to the region's (for example USD and New York); the tick box can be cleared to keep them; the date format (DD/MM/YYYY, MM/DD/YYYY or YYYY-MM-DD) and the first day of the week (Monday, Sunday or Saturday) can be set separately.
- **Wording follows the region** in the menu, the module tabs and page headings. For a US school: Challan → Invoice, Date Sheet → Exam Schedule, Award List → Grade Sheet, Result Card → Report Card; Paid Slips → Receipts, Fee Defaulters → Past-due Accounts, Admission Letter → Acceptance Letter; Timetable → Schedule, Cheque → Check, Enrolment → Enrollment; UK schools get Head Teacher and Exam Timetable, and International schools get neutral terms. Translated menus (other languages) are left as they are.
- **Dates** across the app are written in the school's format (26/09/2026 or 9/26/2026), and the **school calendar** starts the week on the school's chosen day.
- **Forms**: outside Pakistan, the student forms and profile no longer ask for caste, orphan status or OSC, and "B-Form" reads "Birth certificate no. / ID". Anything already recorded is kept.
- **Payment methods** offered when receiving a payment follow the region: Pakistan: cash, bank transfer, JazzCash/Easypaisa (online) and cheque; US: card, ACH bank transfer, check, cash and online.
- **Existing schools are unchanged** until they choose. New schools start as Pakistan when they sign up with PKR, and International otherwise.

### Built

- Backend:
  - `services/core/tenants/localization.py`: the four regions with their wording, date format, week start, Pakistan-only fields and payment methods; the school's locale now includes these;
  - `services/core/tenants/signup.py`: the locale endpoint (`/api/v1/tenants/locale/`) accepts `region` (with `apply_defaults`), `date_format` and `week_start`, admins only, and checks the values; new schools get a region from their currency.
- Frontend:
  - `utils/region.ts`: `useRegion()` (wording, hidden fields, payment options, week start) and the date formatting that follows the school;
  - the locale store holds the region;
  - the region is applied in the sidebar, module tabs, calendar, invoices (receive payment), the add and edit student forms, the student profile, and the Region style settings.
- Tests:
  - `backend/tests/test_region.py` has 3 new tests: the defaults; switching region (wording, dates, week, payment methods, overrides, bad values refused, teachers can read but not change); new schools start in the style of their currency;
  - `frontend/src/utils/region.test.ts`: the wording swaps (whole words only, other languages untouched) and the payment options.
- Passing: these tests plus the school signup tests (15 passed), and the frontend tests.
- Browser check on the demo school (switched to US, then back; the database was restored afterwards):
  - US: the exam tabs read Exam Schedule, Report Card and Grade Sheet, and the menu reads Schedule;
  - the calendar started on Sunday, and dates showed as 9/26/2026;
  - the caste field was gone from the add-student form;
  - receive payment offered Card, ACH bank transfer, Check, Cash and Online payment;
  - back on Pakistan, Date Sheet, Award List, Result Card, a Monday week, 26/09/2026 and the caste field all returned.
  - No page errors.

---

## Phase 21: Privacy & Security ✅

**Upgrade:** Basic authentication/roles → **Enterprise-grade security**.

### Security holes found and closed

- **Anyone could read or change exam results without signing in.** Exams, results, schedules, registrations and admit cards were open to the public. Anyone could list every school's results (names and marks) and create, bulk-enter or delete results. Signed-in parents and students could also write results. Now everything needs a sign-in. People see only their own role's exams and results. Only the office or the class's own teacher can change marks, schedules or registrations.
- **The fee defaulter list, revenue and class collection figures were public.** They are now for school administrators only.
- **Other endpoints that answered without signing in are closed too:** the timetable (it could even be added to); the WhatsApp "test send" (it could send messages through the school's account); the detailed server health page.
- **Anyone could sign in as anyone.** The demo login accepted any existing email address and returned that person's login tokens without a password. It only failed because of a missing import. The endpoint and its code are removed.
- **Teachers were treated as administrators.** Many endpoints trusted Django's "staff" flag, which the demo seed gave to teachers. With it, a teacher could: see every staff member's salary and ID number, and clear all salaries; read the whole audit log of every school; see and reset students' and teachers' portal passwords; switch off anyone's account; change feature flags for all schools; approve leave. All of these now check the school administrator role. Feature flags that affect every school are for the platform owner only.
- **The audit log was shared between schools.** Every entry now belongs to a school, and admins see only their own.
- **Signing out didn't end the session.** The sign-out token list wasn't installed, so a signed-out refresh token kept working for 7 days. Now signing out ends it, and the app sends the token when you sign out.
- **Misleading screens removed:** the "Role Permissions" page, whose switches saved nothing; the "Delete account" button, which only showed a message and recorded nothing. Both are replaced below.

### What a school can now do (Settings → Security & privacy)

- **Overview**: how many people can sign in; who is blocked right now, who is switched off, and who has never signed in; for the last 7 days: sign-ins, wrong passwords, blocked sign-ins, changes made, and refused actions (someone tried something their role doesn't allow); the current rules; deletion requests waiting.
- **People & access**: everyone who can sign in to the school (administrators, teachers, staff, parents, students). Each person shows their last sign-in, where it came from, and any wrong passwords. Search, and filter by role or status: blocked, switched off, wrong passwords, never signed in, asked to be deleted. Actions: **Unlock**; **Sign out** on every device; **Switch off** (signs them out at once); **Switch on**. You can't switch off your own account or reach another school's people. Each action is recorded in the activity log with the person's name.
- **Sign-ins**: every attempt, with: the result (signed in, wrong password, blocked for too many attempts, blocked because switched off); how (password, Microsoft, Google, signup); the IP address and device. Filters, dates, and a CSV download.
- **Activity log**: every change anyone makes in the school (added, changed, deleted, ran), every export, and every refused attempt, with who, when, the area of the app, and the IP address. Filter by person, action, area and dates, and download as CSV. Viewing pages is not recorded, so the log stays readable.
- **Roles & access**: what each role can see and do in each area (students, admissions, attendance, gradebook, fees, messages, library, transport, cafeteria, inventory, reports, search, security, settings), with how many people have each role. The system enforces these on every request; this page describes them in plain words.
- **Rules & retention**: how many wrong passwords before an account is blocked (default 5), and for how long (default 15 minutes); the shortest password (default 8), checked when someone changes their password; sign out after a period of no activity (default off; useful on shared office computers); how long to keep the activity log (default 365 days) and sign-in history (default 180 days).

### Signing in

- After too many wrong passwords in a row the account is blocked for a while. The sign-in page says how many minutes are left, and that the office can unlock it sooner.
- A switched-off account is told so, but only when the password is right.
- Wrong passwords for unknown names are recorded too, without a school.

### Everyone's own privacy (Settings → Account, or Security & privacy for non-admins)

- **My sign-ins & data**: recent sign-ins with device and IP address; a warning if wrong passwords were tried on the account since the person last signed in; **Sign out everywhere**: all sessions on all devices end, including this one; **Download my data**: a JSON file with: the account and preferences; sign-ins and own activity in the school; consents; for parents and students, the children's or their own basic record.
- **Ask to delete my account**: sends a request to the school office, and can be withdrawn; the office sees it on the overview and in People & access; the request is completed when the office switches the account off. The office decides because the school may have to keep some records.

### Built

- Backend:
  - new app `services/core/security`:
    - `SignInEvent`;
    - `policy.py` (the school's rules, lockout, sign-in records, sign out everywhere, password rules);
    - `access.py` (who belongs to a school, the roles summary, activity areas);
    - `api.py` and `urls.py` (`/api/v1/security/`);
    - `tokens.py` (a token refresh that refuses signed-out and switched-off accounts);
    - the command `apply_retention`;
  - the audit log gains a `school` field (audit `0004`), and its middleware now records only changes, exports and refusals;
  - JWT sign-in rejects tokens issued before "sign out everywhere";
  - `rest_framework_simplejwt.token_blacklist` installed;
  - the sign-in view does lockout, disabled accounts and sign-in records, and records successful Microsoft, Google and signup sign-ins too;
  - the "staff flag" checks replaced by the school-administrator check in: portal logins; employee tasks; leave and payslip lists; leave approval; timetable writes; the old admin data endpoints; the student permission classes.
- Frontend:
  - `services/security.service.ts`;
  - `pages/settings/SecurityPage.tsx`;
  - `components/security/MySecurityPanel.tsx` (also on Account settings);
  - `hooks/useIdleSignOut.ts` (in the main layout);
  - the Settings tab "Security & privacy" replaces "Role Permissions"; the old addresses redirect to it;
  - the old audit-log viewer is removed and its address redirects to the Activity log;
  - search shortcuts for security, the activity log, sign-ins and people;
  - the sign-in form no longer shows a second error pop-up.
- Tests:
  - `backend/tests/test_security.py` has 11 new tests:
    - **every API address is tried without signing in**: 400+ routes, GET and POST; only health checks, sign-out, signup settings and the WhatsApp webhook may answer;
    - the demo login is gone;
    - the staff flag gives a teacher no admin access;
    - exam results need the office or the class teacher;
    - lockout and unlock, and stricter rules;
    - switched-off accounts, sign out everywhere, and sign-out ending the refresh token;
    - people and their limits;
    - roles, overview and rules, including the password length;
    - the activity log (school-only, filters, CSV, refusals);
    - retention;
    - my own data;
    - deletion requests.
  - Passing:
    - all 11 new tests;
    - the rest of the backend suite: 134 of 135 tests pass. The one failure already failed before this phase: `test_leave_approval::test_manager_can_approve_leave`. It gives a 404 because the test's manager belongs to no school. It fails the same way without this phase's changes, and is left for later.
    - the frontend tests.
- Browser check on the demo school (the database was restored afterwards):
  - five wrong passwords blocked the student, with "Try again in 15 minutes…" and no extra pop-up;
  - the overview showed 1 blocked and 5 wrong passwords;
  - "Blocked for now" listed Ali Raza, and **Unlock** worked;
  - sign-ins showed the attempts with IP address and "Chrome on Windows";
  - saving a rule and the unlock both appeared in the activity log;
  - the old Role Permissions address opened the roles table (14 areas);
  - the exams and timetable pages still loaded for the office;
  - the student then signed in and saw "5 wrong passwords were tried on your account" on Account settings;
  - **Download my data** gave `my-data.json` with 6 sign-ins, and **Sign out everywhere** returned to the sign-in page.
  - No page errors.

---

## Phase 22: UI/UX & Navigation ✅

**Upgrade:** ~15 flat menu items with terms such as Challan, Date Sheet, Award List → **Modern grouped navigation**.

### What changed for everyone

- **Grouped menu.** The long flat sidebar (28 entries for the office) is now in sections with headings:
  - **Office**: Dashboard, then:
    - **People**: Students, Admissions, Staff;
    - **Academics**: Academic Setup, Timetable, Attendance, Gradebook, Examination, Behaviour & Skills, Certificates;
    - **Billing**: Fees, Salary, Finance;
    - **Communication**: Messages, Announcements, Calendar, Meetings, Communication;
    - **Campus services**: Library, Transport, Inventory, Cafeteria;
    - **Reports**;
    - **Administration**: Security & privacy, Integrations, Settings, All Schools.
  - **Teachers**: Teaching, Communication, Campus services.
  - **Parents**: My family, Billing, Communication, Campus services, Account.
  - **Students**: Learning, Billing, Communication, Campus services.
  - Bus Duty and the Cafeteria Till stay at the top for the staff who have them.
- **Sections fold away.** Click a heading to close or open it. The choice is remembered on the device. The section with the current page always opens, and the current page's link is scrolled into view.
- **Menu search.** Typing in "Search menu…": finds pages in any section, in the chosen language; **Enter** opens the first match; **Esc** clears it; when no page matches, it offers **Search everywhere: "…"**, which opens the school-wide search from Phase 19 (Enter does the same). For example, "raza" opens the matching students.
- **Icon-only sidebar**: the sections are separated by thin lines instead of headings.
- **Wording**: "Employees" is now "Staff". Region wording from Phase 20 still applies (a US school sees Exam Schedule, Grade Sheet, Schedule).
- **Security & privacy** has its own menu entry for administrators.
- **Accessibility**: the menu is a navigation landmark; each section is a labelled group; headings are buttons that announce whether they're open (`aria-expanded`); the current page is marked; the section headings meet contrast on both the light and dark sidebar.

### Built

- Frontend:
  - `components/layout/Sidebar.tsx`: each menu item has a section; headings are collapsible and remembered; the current page's section opens and its link scrolls into view; the menu filter supports Enter and Esc and offers "Search everywhere"; the list is a `<nav>` landmark;
  - `components/layout/navSections.ts`: which items go under which heading, and when a heading is open.
  - The section names, "Staff", "Security & privacy" and "Search everywhere" are translated into all 23 languages.
- Tests:
  - `components/layout/navSections.test.ts`: sections come in a fixed order and keep their items' order; an unknown section falls back to the top; closed sections open while searching, in the icon-only view, and when they hold the current page;
  - the language-file test (every language has every key).
  - The frontend test run has 3 failures that already failed before these phases: `auth.teacher.service`, `student.service` and `teacher.service` tests. One test mock is hoisted before its variable exists; the other two expect old endpoint addresses. They are left for later.
- Browser check on the demo school:
  - the office saw 7 sections and 28 links;
  - closing Campus services and Billing hid their links (21 left), and they stayed closed after a reload;
  - opening the library page reopened Campus services, with Library in view and Fees still hidden;
  - "secur" found Security & privacy and Enter opened it; "raza" offered "Search everywhere" and Enter opened the search results (Students 8);
  - the icon-only sidebar showed 28 icons in separated groups;
  - teacher (Teaching, Communication, Campus services), parent (My family, Billing, Communication, Campus services, Account) and student (Learning, Billing, Communication, Campus services) all saw their sections, including in the mobile drawer.
  - No page errors.

---

## Tier 0 and Tier 1: P1–P17 ✅

Order agreed on 26 Sep 2026: finish all of Tier 0 and Tier 1 (P1 to P17), then deploy, then test on the live site. P10 to P14 were done first; P1 to P9 followed, then P15 to P17.

## P1: Production Readiness ✅

**Every role now reaches only what it should.** The role sweep (every API address, called as each demo role) found wide holes, now closed:

- **Changes by role**: one rule, applied in the sign-in check to every signed-in request before any view runs.
  - **Parents and students** can only make changes in their own areas: their portal and family pages, messages and announcements (marking them read), absence reports, calendar bookings, library, cafeteria top-ups, paying fees online, admissions, and their own account, security and privacy.
  - **Teachers and staff** can't change the school's money (invoices, payments, fee structures, scholarships, payslips, ledgers, salaries, finance settings), its structure (years, terms, classes, sections, subjects, class subjects, teacher assignments, grading setup), student and staff records, settings, integrations, imports, portal logins, security, billing, data export, audit or feature flags. Their own jobs still work: leave requests, bus duty, the cafeteria till, marking attendance, marks for their classes, homework, messages.
  - **Administrators** aren't limited by the rule; each view still applies its own checks.
  - Every refusal is written to the school's activity log.
- **What families can read**:
  - invoices and payments are only their own children's (both invoice lists);
  - the student list and student counts are only their own children;
  - the finance summary and forecast, the invoice and payment CSV exports, the executive dashboard, the attendance, fee, growth and teacher analytics, the staff summary and the registration counter are for administrators only;
  - a student's history summary and AI insights need access to that student.
- **Staff records**: everyone other than the office sees a short public profile (name, number, role, department, subjects). No salary, ID number, phone or address, except a teacher's own record. Creating, changing and deleting staff records is for the office.
- **"Manager" and "HR" roles** can approve leave, as the leave views intended. The role's type had always been read as plain "staff".

**Buttons that pretended to work**

- "Send reminder" on Fee Defaulters waited a second and said "sent" without sending anything. It now emails the family about their oldest open invoice, through the existing reminder, with the office's own text on top. The SMS and WhatsApp options, which sent nothing, are removed.
- "Call parent" showed a message. It now opens the phone dialler (or says there is no number).
- Part 1 (above) removed the browser-stored copies of data from six pages.

**The known failing tests are fixed**

- Backend: the leave-approval manager test. It now uses a school like real data does, and the manager role is recognised.
- Frontend: 3 tests updated to the current behaviour:
  - the mocks are hoisted properly;
  - the student list uses `/students/`;
  - deleting a teacher asks the server, which keeps the record if it has history.

**Built**

- `services/core/security/role_policy.py`, called from `tenants/authentication.py`.
- Read fixes in: `finance/views.py`; `api/v1/views.py`; `accounts/views.py`; `students/views.py`; `analytics/views.py`; `employee/views.py`; `academics/views.py` (the staff privacy mixin).
- `accounts/decorators.py` (the manager and HR roles).
- The fee reminder: `finance/views.py` (the office's own text) and `FeesDefaultersPage.tsx`.
- Tests:
  - `backend/tests/test_role_access.py`: families and teachers can't make office changes, families see only their own records, and a sweep posts to every address as a parent and as a teacher and fails if anything outside their areas gets through (public webhooks and signup excluded);
  - `test_leave_approval.py` fixed, and the 3 frontend tests fixed.
  - Full backend suite: 291 of 291 passed. Frontend: 99 of 99.
- Browser check on the demo school:
  - the parent's dashboard, family, fees, attendance, library, cafeteria, messages and privacy pages loaded with no refusals, and only Ali and Fatima Raza's invoices and records were visible;
  - running invoicing and the executive dashboard were refused;
  - the teacher's day, classes, attendance, gradebook and messages loaded, and creating a payslip was refused;
  - the office's dashboard, students, invoices, defaulters, staff and reports loaded.
  - No page errors.

---

## P2: Database Safety and Backups ✅

**What changed**

- **No more silent data loss.** If the production database can't be found, the app now stops with a clear error instead of quietly starting on a temporary file that is wiped on restart. That old fallback is only on in development, or if `DB_SQLITE_FALLBACK=1` is set on purpose.
- **Encrypted backups of everything.**
  - A backup is the whole database, compressed and encrypted with a key that lives only in the environment (`BACKUP_ENCRYPTION_KEY`, or one derived from the secret key), with a checksum.
  - It is stored in a private S3 bucket when `BACKUP_S3_BUCKET` and the AWS keys are set, otherwise in the app's own storage, with a warning that this isn't durable.
  - It works on any host, with no database tools needed.
  - Backups older than `BACKUP_RETENTION_DAYS` (30) are deleted.
  - A changed or damaged file is refused (checksum).
- **A real restore test.** It loads a backup into a brand-new, empty database in a separate process, then compares the number of records of every kind. The first run caught a genuine problem (rows the set-up creates clashed with the backup), which is fixed.
  - The demo database (**16,442 records of 53 kinds**) restored completely. It takes a few minutes, so from the platform page it runs in the background.
- **Commands** for the daily jobs: `python manage.py backup_database`, and `backup_database --verify` to also test the restore (weekly).
- **Platform owner** (All Schools → Backups):
  - when the last backup and the last successful restore test were, shown in red or amber when overdue;
  - a warning while backups aren't in S3;
  - **Back up now**;
  - **Test restore** for any backup, with the result: "Restored completely", or what was missing.
- **Found on the way:** the backup app's tables had never existed (no migrations), so the old backup code would have crashed. Its migration is now included.

**Still yours to do** (in the checklist):

- move the Render database to a paid plan;
- set the S3 bucket, the keys and `BACKUP_ENCRYPTION_KEY`, and keep a copy of the key safely elsewhere;
- add the daily and weekly cron jobs.

**Built**

- `services/core/backup/portable.py` (create, read, verify, prune), the `backup_database` command, `api.py` and `urls.py` (`/api/v1/backups/`), and the backup migration `0001`.
- Settings: `SQLITE_PATH`, and the fallback off in production.
- `components/platform/PlatformBackups.tsx`.
- Tests: `backend/tests/test_backups.py`:
  - a backup is complete, encrypted, has no sessions or content types, and a changed file is refused;
  - pruning, and who may see backups;
  - the full restore test (runs with `RUN_SLOW=1`; passed on the demo data as described above).

---

## P3: Password Reset and Transactional Email ✅

**What changed**

- **"Forgot password?" works.** The old page asked for an "admin reset key" and called an address the server didn't have (so it answered 404). Now:
  - enter your email and a **reset link** is emailed. The answer is the same whether or not the account exists, so the page can't be used to find out who has an account;
  - requests are limited to 5 an hour per email address and per IP address;
  - the link works **once** and expires in a few days (Django's standard reset tokens);
  - the new password must meet the school's own rule (P21's minimum length and the standard checks);
  - after a reset, the account is unblocked if it was locked out, and **every existing session is signed out**.
- **"Your password was changed" email** after a reset, and after changing the password in Account settings. So a change someone didn't make is noticed.
- **Confirm your email address**: people whose email isn't confirmed see a prompt in "My sign-ins & data" with **Send confirmation email**. The link (valid for 3 days, signed) confirms the address. A link for an address that has since changed is refused.
- **One branded email layout** (school name, heading, text, button, and the plain address as a fallback) for these emails, in text and HTML. Emails go through the school's own email when it has set one up (Phase 17), otherwise the platform's.
- **Delivery log**: every system email is recorded (what, to whom, sent or failed, and the error), and a mail-server failure never breaks the action that triggered it. There is a new Security & privacy tab, **Emails sent**, with a "failed only" filter and the count of failures in the last week. Administrators see their school's; the platform owner sees all.
- **Still yours** (in the checklist): the SPF, DKIM and DMARC records for the sending domain, so the emails don't land in spam.

**Built**

- Backend:
  - `services/core/security/mailer.py` (layout and send with logging);
  - `password.py` (reset request and confirm, the changed notice, verification);
  - `EmailLog` (security migration `0002`);
  - `/api/v1/security/password-reset/`, `password-reset/confirm/`, `verify-email/send/`, `verify-email/confirm/` and `emails/`;
  - the notice on password change;
  - email confirmation and reset added to P1's always-allowed personal list.
- Frontend:
  - `pages/auth/ForgotPasswordPage.tsx` (rewritten);
  - `pages/auth/ResetPasswordPage.tsx` (`/reset-password` and `/verify-email`);
  - the confirmation prompt in `MySecurityPanel.tsx`;
  - the Emails sent tab;
  - the dead `resetPassword` call removed.
- Tests:
  - `backend/tests/test_password_reset.py` has 4 new tests:
    - reset by email (same answer for unknown addresses, the school's password rule, the old password stops working, old sessions signed out, a link works once, the changed notice, the log);
    - requests are limited;
    - changing the password sends a notice;
    - email verification and the log (a stale link is refused, and a mail-server failure is logged, not raised).
  - Passing: these plus the role-access tests (7 passed).
- Browser check on the demo school (the database was restored afterwards):
  - "Forgot password?" on the sign-in page gave "Check your email", and the reset email was logged as sent;
  - a bad link said "not valid any more";
  - a valid link set the new password, and the teacher signed in with it;
  - a bad confirmation link said "This link is not valid."
  - No page errors.

---

## P4: Error Tracking and Uptime Monitoring ✅

**What changed**

- **Every server error is recorded.** Any unhandled error in a request is saved with the page address, the school, the user, the version running and the full technical details. The same error happening again (even with a different student or number in the message) is **counted in one group**, not listed a thousand times.
- **Browser errors too.** When a page breaks in someone's browser (a code error, or a section that fails to show), the app sends a short report to the server. Each distinct error is sent once per page load, at most 20 per session. Network drops and browser add-ons are ignored. Anyone can send a report, including people who are not signed in, but it is limited to 60 an hour per address.
- **Email alert** to the platform owner when a new error appears, or when a resolved one comes back. At most one alert an hour per error. Alerts go to `ERROR_ALERT_EMAILS` if set, otherwise to the superusers.
- **Errors panel** on the platform owner's All Schools page:
  - open, resolved and ignored errors, server or browser, with how many times each happened and when it was last seen;
  - click an error to see its latest cases with the details;
  - **Mark resolved** (you hear again if it comes back), **Ignore** or **Reopen**.
- **Optional Sentry**: set `SENTRY_DSN` (and install `sentry-sdk`) to also send server errors there. Without it, the built-in tracking is enough.
- **A failed deploy is noticed the same day.**
  - `/api/v1/health/version/` says which commit the live server runs.
  - A new GitHub check (`.github/workflows/deploy-check.yml`) runs after every push to main. It waits up to 20 minutes for the live backend to run the new commit, and **fails** (GitHub emails the person who pushed) if it doesn't. Render keeps serving the old version when a deploy fails, which is why earlier failures went unnoticed.
- **Still yours** (in the checklist):
  - a free uptime monitor (for example UptimeRobot) on `/api/v1/health/live/` and on the site's address;
  - setting `ERROR_ALERT_EMAILS`;
  - optionally, `SENTRY_DSN`.

**Built**

- Backend:
  - new app `services/core/errors`:
    - `ErrorGroup` (migration `0001`);
    - `capture.py` (grouping, alerts, optional Sentry), connected to Django's request-error signal;
    - `api.py`: `/api/v1/errors/client/` (browser reports), `/api/v1/errors/` and `/api/v1/errors/<id>/` (platform owner only);
  - `health/version/`.
- Frontend:
  - `utils/errorReporter.ts`;
  - reporting from the global error handlers and the error boundary in `utils/errorHandler.tsx`;
  - `components/platform/PlatformErrors.tsx`.
- Tests:
  - `backend/tests/test_errors.py` has 3 new tests:
    - server errors are grouped and alerted once, and a resolved error that comes back reopens and alerts again;
    - browser reports (grouped, limited per address, platform owner only, details, status checks);
    - the version endpoint.
  - The version endpoint was added to the public allow-list in `test_security.py`.
  - All 3 passed.
- Browser check on the demo school (the database was restored afterwards):
  - an error thrown twice on the teacher's page sent **one** report;
  - the teacher was refused the errors list (403);
  - the platform owner's Errors panel showed the browser error (school and teacher named) and a server error;
  - the details showed the stack;
  - **Mark resolved** moved it to the Resolved list.

---

## P5: Test-and-Deploy Pipeline and Staging ✅

**What changed**

- **The old CI failed on every push, so nobody looked at it.** It used retired GitHub actions, ran type checks the code was never written for, and its backup job backed up an empty test database. It is rewritten (`.github/workflows/ci-cd.yml`, now called **CI**) to run on every push and pull request:
  - **Backend tests**: first a check for missing migrations, then the full test suite, in parallel;
  - **Production settings and migrations (Postgres)**: with DEBUG off, the settings must load, every migration must apply to an empty Postgres, and static files must collect. These are the same steps as the Render start command, so a deploy that would fail is caught here;
  - **Frontend**: type check, tests and a full build;
  - **Postgres (report)**: the tests on Postgres like production. It only reports and does not block.
- **A broken commit no longer reaches the live site.** `render.yaml` now deploys only after the CI checks pass (`autoDeployTrigger: checksPass`). The P4 **Deploy check** now starts when CI has passed, then confirms that the live backend runs the new commit.
- **Staging site** (`deploy/render-staging.yaml`, created once as a separate Render Blueprint):
  - deploys the `staging` branch (`git push origin main:staging`);
  - on every deploy it can load the newest live backup and **anonymise** it (`load_staging_data`):
    - made-up names, emails, phone numbers, ID numbers and addresses (the same real value always gets the same made-up one, so family links and links by email still work);
    - birth dates keep the year;
    - health notes, occupations and incomes are emptied;
    - payment, SMS, WhatsApp and integration keys and 2-step codes are removed;
    - sign-in and email logs, sessions and tokens are emptied;
    - audit logs keep what happened but not the before/after values;
    - file links and IP addresses are removed;
    - every account gets one `STAGING_PASSWORD`;
    - it stops with an error if any real account email is left;
  - the anonymiser **refuses to run** unless `APP_ENV=staging`, so it can never touch the live database;
  - a staging site **never sends real email** (it goes to the log);
  - `/api/v1/health/version/` says which site it is;
  - the web app shows an amber **"Staging site: anonymised test data"** strip on every page when built with `VITE_APP_ENV=staging`.
- **Release checklist**: `docs/RELEASE_CHECKLIST.md` covers before you push, trying a change on staging, what the pipeline does, and checks and rollback after a deploy.
- Free-text notes (announcements, comments, chat messages) are **not** rewritten on staging. The file says so.

**Built**

- CI:
  - `.github/workflows/ci-cd.yml` (rewritten);
  - `backend/requirements-dev.txt` (pytest, pytest-django, pytest-cov, pytest-xdist);
  - parallel test workers each keep their own cache, so a shared Redis can't leak one test's sign-in limits into another;
  - parallel workers on Postgres each get their own test database (`conftest.py` had been dropping pytest-django's per-worker name);
  - the login view guessed "we are in a test" from the command line to let role-less test users in. That failed in parallel workers. It is now an explicit `ALLOW_LOGIN_WITHOUT_ROLE` setting, which only the test setup turns on.
- Deploy:
  - `render.yaml` `autoDeployTrigger: checksPass`;
  - `.github/workflows/deploy-check.yml` now runs after CI;
  - `deploy/render-staging.yaml`.
- Backend:
  - `APP_ENV` setting;
  - `services/core/backup/anonymise.py`;
  - command `load_staging_data` (`--backup latest|<file>`, `--anonymise-only`);
  - `portable.latest_name()` and `read_named()`.
- Frontend: the staging strip in `App.tsx`.
- Tests:
  - `backend/tests/test_staging.py` has 3 new tests:
    - refuses outside staging;
    - people, secrets, logs and audit details are anonymised, the staging password works, and a second run is harmless;
    - a real encrypted backup is restored and anonymised by `load_staging_data`.
  - All 3 passed.
  - Frontend: type check, 99/99 tests and the production build pass.
  - The migration check reports "No changes detected".
  - `check --deploy` with DEBUG off passes at error level.
- Browser check on a **local staging copy**:
  - a copy of the demo database was anonymised with `load_staging_data --anonymise-only`;
  - it was served with `APP_ENV=staging` and a web app built with `VITE_APP_ENV=staging`;
  - the staging strip showed;
  - the real `teacher@code.com` sign-in was refused;
  - made-up teacher and admin accounts signed in with the staging password;
  - the student list showed only made-up names;
  - the normal site had no strip.

**Still yours** (in the checklist):

- delete `.github/workflows/backup.yml`: it fails on every push and only backed up an empty test database (real backups are P2's `backup_database`);
- in Render, check that erp-backend's Auto-Deploy says "After CI checks pass";
- create the staging Blueprint if you want staging.

---

## P6: Web Security Hardening and Rate Limits ✅

**What changed**

- **Only our web app may call the API from a browser.** Before, *any* website was allowed (`CORS_ALLOW_ALL_ORIGINS`, with credentials). Now:
  - only the addresses in `FRONTEND_ORIGINS` are allowed; the same list is trusted for CSRF;
  - on your own computer (DEBUG) anything is still allowed;
  - if `FRONTEND_ORIGINS` is not set on the live site yet, only the hosts' default addresses (`*.vercel.app`, `*.onrender.com`) are allowed and a warning is logged, so the live site keeps working until you set it.
- **HTTPS only in production** (each setting can be switched off by environment):
  - plain HTTP is redirected to HTTPS; Render's internal health checks are exempt;
  - HSTS for a year (subdomains and preload stay opt-in, because they are hard to undo on a custom domain);
  - session and CSRF cookies are HTTPS-only;
  - the proxy's `X-Forwarded-Proto` header is trusted.
  - `check --deploy` now has no warnings except those two opt-ins.
- **Browser protection headers on the API**:
  - every JSON or file answer gets the strictest Content-Security-Policy (nothing may run, load or frame it);
  - Django's own pages (admin, API docs) get a policy that allows only this site;
  - a Permissions-Policy on every response;
  - frames are refused (`DENY`), plus nosniff, a referrer policy and an opener policy.
- **Web app headers** (`frontend/vercel.json`):
  - a Content-Security-Policy that allows scripts only from the app itself and Google sign-in, styles and fonts from the app and Google Fonts, and frames only for Google sign-in; no plugins; nobody may frame the app;
  - HSTS, `X-Frame-Options: DENY`, nosniff and a referrer policy;
  - `Cross-Origin-Opener-Policy: same-origin-allow-popups`, so the Google sign-in popup still works;
  - a Permissions-Policy that allows the camera and microphone only for the app's own live classes.
  - The small dark-mode script that ran inline in `index.html` is now a file (`public/theme-init.js`), so the page needs no inline scripts.
- **Wrong passwords are limited per network address.** P21's lock is per account, so one address could try a common password on hundreds of accounts. Now:
  - 30 wrong passwords in 15 minutes from one address blocks further sign-ins from that address for 15 minutes, with the message "Too many wrong passwords from this network";
  - only failures count, so a whole class signing in from the school's network is never blocked.
- **The visitor's address can't be made up any more.** The app used the first `X-Forwarded-For` entry, which the visitor controls. It now uses the entry Render's proxy adds (`TRUSTED_PROXIES`, 1 by default in production). This applies to the audit log, sign-in history, the password-reset limit, error reports, admissions and DRF's per-address limits.
- **Rate limits already in place** (checked, unchanged):
  - signup: 10 an hour per address;
  - admissions forms: 20 an hour;
  - password reset: 5 an hour per email and per address (P3);
  - browser error reports: 60 an hour (P4);
  - AI assistant: `AI_RATE_LIMIT` per user per window, plus the monthly school quota.

**Built**

- Backend:
  - `erp_core/security_settings.py` (CORS, HTTPS and proxy rules as testable functions), applied in `settings.py`;
  - `services/core/security/headers.py` (`SecurityHeadersMiddleware`);
  - `policy.client_ip` rewritten, plus `too_many_failed_sign_ins` and `count_failed_sign_in`, used in `login_view`;
  - the audit and admissions address helpers now use `policy.client_ip`;
  - DRF `NUM_PROXIES`.
- Frontend: `vercel.json` headers and `public/theme-init.js`.
- Tests:
  - `backend/tests/test_web_security.py` has 6 new tests:
    - CORS rules (development, live with the list, live without it);
    - HTTPS settings in production and the switches;
    - a made-up address is ignored;
    - headers on API answers and on Django pages;
    - only the listed web app gets CORS headers;
    - the per-address limit on wrong passwords, another address unaffected, and right passwords never counting.
  - All 6 passed.
- Browser check:
  - the **production build** was served with the exact `vercel.json` headers (locally, the only changes were allowing the local API address and leaving out the HTTPS upgrade);
  - pages visited as the administrator: dashboard, students, fees, attendance, exams, messages, settings, security, platform, timetable and reports;
  - as the teacher: dashboard, gradebook and live room;
  - as the parent: dashboard and privacy;
  - **0 Content-Security-Policy violations**, and pages, fonts and images showed normally;
  - dark mode was still applied before paint;
  - the API answered with the strict CSP, Permissions-Policy and `DENY`;
  - after 30 wrong passwords from one address, the sign-in form showed "Too many wrong passwords from this network" (429).

**Still yours** (in the checklist): set `FRONTEND_ORIGINS` on Render to the web app's real address(es). Until then, any `*.vercel.app` or `*.onrender.com` page may call the API.

---

## P7: Secrets and Default Passwords ✅

**What changed**

- **No sign-in with a publicly known password on the live site.** The demo passwords (`Admin@123`, `Teacher@123` and the others printed in the README) and the old shared defaults (`student123`, …) are refused at sign-in when `APP_ENV=production`, with this message: "This password is publicly known, so it can't be used here. We've emailed you a link to choose your own password." The link is sent automatically. The email link proves it is really the person; a forced "change your password" screen would not, because anyone who knows the demo password could pass it. On a developer's computer and on staging the demo still works as the README says.
- **Nobody can choose one of these passwords anywhere**: a new password check applies to changing a password, resets and every other place passwords are checked.
- **Demo tooling refuses to run on the live site**: `seed_demo`, `seed_sample_users`, and `sync_student_accounts` with its demo default; the three loose scripts that reset everyone to the demo passwords (`sync_all_user_passwords.py`, `sync_existing_portal_users.py`, `generate_complete_system_data.py`); `create_admin` skips a demo `ADMIN_PASSWORD`.
- The backend landing page no longer prints "Admin Login: admin@example.com / admin123".
- **Keys can be changed without breaking things** (`docs/KEY_ROTATION.md`):
  - `SECRET_KEY_FALLBACKS` keeps links already sent working, and saved integration secrets (school email, Microsoft, Google Classroom) readable, after a `SECRET_KEY` change;
  - the new `rotate_secrets` command re-encrypts those secrets with the new key;
  - backups can be read with `BACKUP_ENCRYPTION_KEY_FALLBACKS` and with keys derived from old `SECRET_KEY`s, so backups made before setting `BACKUP_ENCRYPTION_KEY` stay restorable.
  - The note covers each key: where it lives, how to change it and what to expect.
- **Live site settings panel** (platform owner, All Schools). It checks that: the secret key is set and debug mode is off; `FRONTEND_ORIGINS` is set; there is an own backup key, and backups go to S3; email and the alert address are set up; no demo accounts are left (`teacher@code.com`, …); no platform owner uses a demo password (checked by hashing, kept for an hour); `ADMIN_PASSWORD` has been removed from the environment after the first start. Each failing check says what to do.
- Checked: no real keys are in the code. The one match is the Firebase web key in `firebase.ts`, which is a public identifier by design, not a secret.
- Not changed: each school's own payment, SMS and WhatsApp keys are still stored as entered, in the database, not encrypted like the integration secrets. That is noted for later.

**Built**

- Backend:
  - `services/core/security/defaults.py` (the known list, `KnownPasswordValidator`, `refuse_on_live`);
  - the refusal in `login_view`;
  - the validator in `AUTH_PASSWORD_VALIDATORS`;
  - `SECRET_KEY_FALLBACKS`;
  - `MultiFernet` in `integrations/secrets.py` and `backup/portable.py`;
  - `rotate_secrets`;
  - guards on the seed commands, the scripts and `create_admin`;
  - `security/setup_checks.py` at `/api/v1/security/setup-checks/`.
- `render.yaml` declares `SECRET_KEY_FALLBACKS`, `BACKUP_ENCRYPTION_KEY` and `BACKUP_ENCRYPTION_KEY_FALLBACKS`.
- Frontend: `components/platform/PlatformSetupChecks.tsx`.
- Docs: `docs/KEY_ROTATION.md`.
- Tests:
  - `backend/tests/test_secrets.py` has 6 new tests:
    - demo passwords can't be chosen;
    - the live site refuses a demo password and emails a link, while development allows it;
    - demo tooling refuses on the live site, and `create_admin` skips a demo password but accepts a strong one;
    - integration secrets survive a key change and are re-encrypted;
    - backups made with the old key can still be read;
    - the settings check (platform owner only, flags demo accounts, demo passwords, `ADMIN_PASSWORD` and `FRONTEND_ORIGINS`).
  - All 6 passed.
- Browser check on a **live-mode copy** of the demo database (`APP_ENV=production`, separate ports; the everyday local site was left untouched):
  - `teacher@code.com` / `Teacher@123` was refused (403) with the "publicly known" message on the sign-in form, and the reset email was logged;
  - the platform owner (strong password) saw **Live site settings** with each missing item and its advice, including the demo accounts and the leftover `ADMIN_PASSWORD`.

**Still yours** (in the checklist): open **Live site settings** after the deploy and fix what it lists. In particular, switch off the demo accounts if they were ever created on the live site, and remove `ADMIN_PASSWORD`.

---

## P8: Two-Step Sign-In for Administrators ✅

**What changed**

- **Two-step sign-in with an authenticator app.** These are the standard 6-digit codes that Google Authenticator, Microsoft Authenticator, 1Password and similar apps show. Anyone can turn it on in **Account → My sign-ins & data**:
  1. scan the QR code (or type the key);
  2. enter a code to confirm;
  3. save the **ten recovery codes**, shown once, with Copy and Download.
  - From then on, signing in asks for a code after the password.
  - It also applies to **Google and Microsoft sign-in**, which now ask for the code too.
  - A lost phone: each recovery code signs in once; "New recovery codes" makes a fresh set.
  - Turning it off needs the password and a code.
- **Required where it matters**:
  - **platform owners** on the live site (`REQUIRE_2FA_PLATFORM_OWNER`, on by default in production);
  - a school's **administrators** when the school ticks "Administrators must use two-step sign-in" in Security → Rules.
  - Someone who must use it but hasn't yet gets a setup screen right after signing in, and the server refuses their changes until it is on (reading still works). Required accounts can't turn it off.
- **Lost phone and codes**: the school office can use **Reset two-step** in People & access. The person is signed out and can set it up again. The action is recorded in the activity log.
- **Safety details**: the phone key is stored encrypted, and recovery codes only as hashes; a code can't be used twice, and one step of clock difference is allowed; the sign-in challenge expires after 5 minutes and allows 5 wrong codes; wrong codes count towards the account's lockout (P21) and the per-address limit (P6); turning it on or off and new recovery codes are recorded in the activity log; staging copies drop everyone's two-step keys; the Live site settings panel warns about platform owners without it.

**Built**

- Backend:
  - `TwoFactor` (security migration `0003`);
  - `services/core/security/twofactor.py` (codes to RFC 6238, the encrypted key, recovery codes, the sign-in challenge, who must use it);
  - `twofactor_api.py` at `/api/v1/security/2fa/` (status, `setup/`, `confirm/`, `disable/`, `recovery-codes/`);
  - `/api/v1/auth/login/2fa/`;
  - `build_login_response` asks for the second step for every sign-in method;
  - the setup requirement is enforced in `TenantJWTAuthentication`;
  - the school rule `admin_two_factor`;
  - the `reset_two_factor` people action;
  - `security/2fa/` added to the always-allowed personal and read-only lists.
- Frontend:
  - `components/auth/TwoStepCodeForm.tsx` (the code step on the sign-in page, with "use a recovery code");
  - `TwoStepNeeded` and `completeTwoStep` in the auth store;
  - `components/security/TwoStepSection.tsx` (setup, recovery codes, turn off) in My sign-ins & data;
  - `TwoStepGate.tsx` in the layout;
  - the school rule checkbox and **Reset two-step** in `SecurityPage.tsx`.
- Tests:
  - `backend/tests/test_two_factor.py` has 5 new tests:
    - codes match the RFC 6238 test vector;
    - sign-in with two steps (wrong code, no reuse, clock drift, recovery code once, made-up challenge, too many tries);
    - Google and Microsoft sign-in also ask for the code;
    - required for platform owners on the live site and for administrators when the school asks, and can't be turned off then;
    - turning it off, new codes, and the office reset.
  - All 5 passed. Frontend: 99/99.
- Browser check on a copy of the demo database (separate ports), with two-step required for the platform owner:
  - after signing in, the **setup screen** appeared;
  - the QR code was scanned (a real code was computed from the key) and two-step turned on;
  - 10 recovery codes were shown;
  - the next sign-in asked for the code: a wrong code gave "That code is not right", and the right one signed in;
  - a **recovery code** signed in once;
  - the teacher, without two-step, signed in as before and saw "Two-step sign-in: Off" with a working setup (QR shown) in Account.

**Still yours** (in the checklist): after the deploy, the platform owner sets up two-step sign-in (the live site asks at the first sign-in; have an authenticator app ready) and keeps the recovery codes somewhere safe.

---

## P9: Dependency and Code Scanning ✅

**What changed**

- **Known vulnerabilities fixed now:**
  - the web app's packages had **16 known vulnerabilities (1 critical, 8 high, 7 moderate)**, including `websocket-driver`, `ws`, `protobufjs`, `vite` and `postcss`;
  - `npm audit fix` updated them within their allowed versions, with no major upgrades; the type check, 99/99 tests and the production build still pass;
  - **5 moderate** ones remain: `react-router` 6 → 7 and a test-only `vitest` package. Both need a major upgrade, which is safer after the deploy than just before it;
  - the backend's 129 installed Python packages were checked against the OSV vulnerability database, with **no known advisories**.
- **Scanning on every push** (`.github/workflows/security-scan.yml`), on every push and pull request and every Monday (new advisories appear for code that hasn't changed):
  - **pip-audit** on `backend/requirements.txt`;
  - **npm audit** on the packages the web app ships (high or critical fail the check);
  - **CodeQL** analysis of the Python and TypeScript code (the `security-extended` rules); findings appear in the repository's Security tab.
- **Dependabot** (`.github/dependabot.yml`): weekly pull requests for Python and npm updates, with minor and patch updates grouped, and monthly ones for GitHub Actions. Each runs CI, so a breaking update shows as a red check instead of reaching the live site.

**Built**

- `.github/workflows/security-scan.yml`, `.github/dependabot.yml` and `frontend/package-lock.json` (updated).
- Checks:
  - `npm audit --omit=dev` went from 16 vulnerabilities (1 critical, 8 high) to 5 moderate;
  - after the update: type check, vitest 99/99, and the production build all pass;
  - the Python packages have no advisories in OSV;
  - the backend suite is unaffected (320 passed with P8).

**Still yours** (in the checklist): in GitHub → Settings → Code security, switch on Dependabot alerts and security updates. CodeQL results then appear under Security → Code scanning after the first push.

---

## P10: School Onboarding and Data Import ✅

**What a school can now do**

- **Import data** (Administration → Import data, or **Import Students** on the admission form) from a CSV or Excel (.xlsx) file, in five steps:
  1. **Classes and sections**, including grade level, capacity and tuition fee. For an existing class, only its new sections are added.
  2. **Subjects**, with code, department and elective.
  3. **Teachers and staff**: email (their sign-in), employee number, role, subjects, joining date, salary, qualifications.
  4. **Students and guardians**: class and section, date of birth, the father's, mother's and guardian's details, address, and more. Families and the parents' portal logins are created just as on the admission form.
  5. **Opening fee balances**, by student number. Each becomes an "Opening balance" invoice.
- **Templates**: each step has a downloadable template. Column headings are matched loosely (for example "Roll No", "GR No" or "Admission No" all mean the student number).
- **Preview first.** Every row is checked before anything is saved, and marked **Ready**, **Already exists** or **Needs fixing** with the reason. Checks include: a class or section that doesn't exist; a bad date, amount or email; a student number or email that already exists; the same student (name and date of birth) already in the school; the same row twice in the file. Missing student and employee numbers continue the school's own numbering (for example DS-2026120 is followed by DS-2026121).
- **Import** adds all the ready rows in one go. If one can't be saved, nothing is saved and the office is told which row.
- Duplicates and rows with problems are skipped and can be downloaded as a CSV to fix and import again.
- **Past imports**: who imported what and when, with the results and the skipped rows.
- **Setup checklist** on the dashboard has two new steps, **Choose language, currency and region style** and **Set up the school year and terms**, and an **Import** shortcut beside classes, subjects, staff and students. The region step counts once the office has saved Language & currency.

**Built**

- Backend:
  - new app `services/education/imports`: `specs.py` (the five imports: columns, checks, duplicates, saving), `api.py` and `urls.py` (`/api/v1/auth/imports/`: kinds, template, preview, import, history, skipped rows), and `ImportRun` (migration `0001`);
  - administrators only;
  - `openpyxl` added to `requirements.txt`;
  - onboarding steps extended in `tenants/signup.py`.
- Frontend:
  - `pages/education/ImportPage.tsx` and `services/imports.service.ts`;
  - import shortcuts on the setup checklist;
  - the admission form's Import Students button now works;
  - "Import data" in the Administration menu and in search;
  - translations in all 23 languages.
- Tests:
  - `backend/tests/test_imports.py` has 5 new tests: classes, subjects and the template; staff, students and opening balances; bad files and who may import; nothing saved if a row fails; onboarding steps.
  - Passing: these plus the signup and region tests (20 passed), and the frontend type check.
- Browser check on the demo school (the database was restored afterwards):
  - Import Students opened the student step, and the template downloaded;
  - a 3-row file previewed as 1 ready (to get DS-2026121), 1 "Grade 99 does not exist" and 1 "DS-2026001 already exists";
  - importing gave "1 added, 1 already existed, 1 had problems", and search then found the new student;
  - Past imports listed it.
  - No page errors.

---

## P11: SaaS Plans and Subscriptions ✅

**Plans** (prices in USD; the platform owner can change them)

| Plan | Monthly | Yearly | Students | Staff | Optional modules |
| --- | ---: | ---: | ---: | ---: | --- |
| Starter | 49 | 490 | 150 | 20 | none (core only) |
| Standard | 99 | 990 | 500 | 60 | library, transport, advanced reports |
| Premium | 199 | 1,990 | 1,500 | 150 | also inventory, cafeteria, integrations, AI assistant, online fee payments |
| Enterprise | custom | custom | unlimited | unlimited | everything; arranged with the team |

The core is in every plan: students, admissions, attendance, gradebook, fees, messages, calendar and security.

**What a school sees** (Settings → **Plan & billing**, administrators)

- The current plan and its status, the modules it includes, and bars for active students and staff against the plan's limits.
- The plans side by side, monthly or yearly (two months free). A plan that is too small for the school says why.
- **Choose a plan**: upgrades apply at once. A smaller plan starts when the paid period ends, and only if the school's students and staff fit it.
- **Cancel**: the school keeps working until the end of the period, then becomes read-only. Nothing is deleted. It can be undone before then.
- A history of every change.

**How subscriptions behave**

- **New schools** get a 30-day free trial of Premium, so they can try everything.
- **Schools from before plans existed** (the demo school) keep working with everything open until a plan is chosen or assigned.
- **Statuses**: free trial, active, payment overdue (7 days' grace after the paid period), read-only, suspended, cancelled.
  - After an expired trial or the end of the grace days, the school is **read-only**: everyone can view and export, but nothing can be added or changed.
  - Choosing a plan, paying fees online, and personal account safety still work.
- **Modules outside the plan** are refused by the server (402, "Library is not included in your Starter plan…") and hidden from the menus. The AI assistant button hides too.
- **Limits**: adding a student or staff member beyond the plan's limit is refused with a clear message. The import preview marks the rows that would go over.
- **Banners** above every page:
  - administrators: "Your free trial ends in N days" (last week), "Payment overdue…", "The school is read-only… choose a plan";
  - everyone else: "…please contact the school office".
- **Platform owner** (All Schools page), "Plans and subscriptions":
  - every school's plan, status, dates and numbers;
  - **Manage**: change plan, billing, status or trial end, with a note;
  - **Record payment**: starts a paid period and applies a scheduled plan change;
  - a **price list** editor for prices and limits.

**Built**

- Backend:
  - new app `services/core/billing`:
    - `Plan`, `Subscription` and `SubscriptionEvent` (migrations `0001`, and `0002` for the four plans);
    - `service.py`: trial, usage, limits, plan changes, renewal, and the request check;
    - `signals.py`: student and staff limits;
    - `api.py` and `urls.py` (`/api/v1/billing/`: plans, subscription, change, cancel; platform overview, school, plan);
  - the plan check runs in the JWT sign-in, right after the school is known;
  - signup starts the trial;
  - the import preview respects the limits.
- Frontend:
  - `pages/settings/BillingPage.tsx`;
  - `components/billing/SubscriptionBanner.tsx`;
  - `store/planStore.ts` and `services/subscription.service.ts`;
  - `components/platform/PlatformBilling.tsx` on the All Schools page;
  - the sidebar and the AI button follow the plan;
  - a "Plan & billing" settings tab and search shortcut.
- Tests:
  - `backend/tests/test_billing.py` has 5 new tests:
    - plans, and trials for new schools;
    - modules outside the plan are closed;
    - read-only after the trial, then renewal and the grace days;
    - limits and plan changes (upgrade, scheduled downgrade, too-small refusal, Enterprise, cancel and resume);
    - the platform owner manages schools and prices.
  - Passing: these plus the import, signup and security tests. The public price list was added to the list of addresses that may answer without signing in.
- Browser check on the demo school (the database was restored afterwards):
  - Plan & billing showed "No plan (unlimited)";
  - choosing Standard gave "Now on Standard" (a trial), and Inventory, Cafeteria and the AI assistant disappeared from the menu;
  - the platform owner ended the trial: the red read-only banner appeared for the office and the teacher;
  - **Record payment** ("bank transfer") made it active until 26 Oct 2026, and the history listed each step.
  - No page errors.
- A mistake caught during the work: the new frontend service first overwrote the existing family-billing `billing.service.ts`. It was restored from git, and the new one is `subscription.service.ts`.

---

## P12: Platform Payments and Invoices ✅

**What a school sees** (Settings → Plan & billing)

- **Invoices** from the platform:
  - number (PI-2026-00001…), what it's for (plan and period, or the difference for an upgrade), due date, total and status (open, overdue, paid, cancelled);
  - **View / print**: a clean invoice page to print or save as PDF, with the seller's and the school's details, tax and any payment reference;
  - **Pay by card**: Stripe Checkout, once the platform's Stripe keys are set. Otherwise the page shows the bank-transfer details, with the invoice number as the reference;
  - after a card payment the page confirms it, and the invoice turns paid when Stripe's signed confirmation arrives.
- **Billing details**: legal name, address, country code, tax ID and billing email. They are printed on new invoices, the country and tax ID decide the tax, and reminders go to the billing email (or the school's admins).

**How invoices are made**

- **Choosing a plan** issues the first invoice. During a trial it's due when the trial ends; paying early keeps the rest of the trial. For a read-only school it's due today.
- **Upgrading mid-period** issues an invoice for the price difference for the days left, due in 7 days. Paying it doesn't move the renewal date. Downgrades aren't billed until renewal.
- **Renewals**: a daily job issues the next period's invoice 7 days before it's due (using a scheduled smaller plan if there is one). Only one invoice is ever made per period.
- **Paying** a period invoice starts the paid period (P11's renewal).
- **Payment reminders** by email, each sent once: 3 days before, on the due date, then 3 and 7 days late. The last one says the school will become read-only. After the 7 days' grace, P11 makes the school read-only automatically until it pays.
- **Tax**: rules by country (for example GB VAT 20%). "Reverse charge" means a school that gives a tax ID pays no tax, and the invoice says so. Amounts are rounded to the cent.

**Platform owner** (All Schools page)

- Every school's invoices, filtered by open, overdue, paid or cancelled.
- **Mark paid** (with the bank reference) and **Cancel**. A paid invoice can't be cancelled.
- **Run billing now** (the same as the daily job).
- **Tax on invoices**: add or remove country rules.
- Every payment is written into the school's subscription history, with its reference.

**Built**

- Backend:
  - `TaxRule` and `PlatformInvoice` (billing migration `0003`);
  - `invoicing.py`: billing details, tax, issuing, proration, upcoming invoices, paying, cancelling, reminders and the daily run;
  - `stripe_platform.py`: Checkout with the platform's own keys, reusing the Stripe helpers from fees;
  - `invoice_api.py`: details, invoices, invoice, pay, the signed Stripe webhook, and the platform invoices, actions, run and tax endpoints;
  - the command `run_platform_billing`;
  - choosing a plan now bills it.
- Frontend:
  - `components/billing/InvoicesPanel.tsx` (invoices, pay, bank details, billing details);
  - `pages/settings/InvoicePrintPage.tsx`;
  - `components/platform/PlatformInvoices.tsx` (invoices, run billing, tax rules).
- Deployment: the new `PLATFORM_*` settings are declared in `render.yaml`, and the daily job is added to the checklist.
- Tests:
  - `backend/tests/test_platform_invoices.py` has 5 new tests:
    - billing details and tax, including reverse charge and one invoice per period;
    - choosing a plan bills, and paying early keeps the trial;
    - a read-only school gets bank details, then a signed Stripe webhook marks the invoice paid and opens the school again (a bad signature is refused);
    - the upgrade difference, renewals and the four reminders;
    - the platform owner marks paid, cancels, runs billing and sees the reference in the history.
  - Passing: these plus the P11 tests (10 passed).
  - The full backend suite after P11: 273 passed. The only failure is the one that already failed before (the leave-approval manager test).
- Browser check on the demo school (the database was restored afterwards):
  - the platform owner added GB VAT 20%, and the school saved its billing details;
  - choosing Starter gave "Invoice PI-2026-00001 (USD 58.80) is ready";
  - the printable invoice showed $49.00 plus VAT 20% ($9.80) = $58.80, due 26 Oct 2026, billed to "CodeCortex Model School Ltd";
  - the platform owner marked it paid with reference TRF-2026-09-26, and the school was then "Active, paid until 25 Nov 2026".
  - No page errors.

---

## P13: Full School Export and End-of-Contract Deletion ✅

**What a school can now do** (Settings → Security & privacy → **Data export & deletion**, administrators)

- **Export all school data**: a complete copy of every record in every module (students and families, staff, classes, attendance, marks, fees and payments, messages, library, transport, cafeteria, inventory, imports and more), plus everyone who can sign in. It comes in three formats:
  - **CSV files**: one file per kind of record, plus uploaded documents and photos, in a zip;
  - **Excel workbook**: one sheet per kind of record;
  - **JSON**: for moving to another system, plus uploaded files, in a zip.

  Every export has a manifest (record counts) and a README explaining how the IDs link records. Passwords, sign-in secrets and integration keys are never included. Past exports are listed and kept for 7 days, then removed.
- **Delete the school's data** when the contract ends:
  - type the school's name to confirm (and optionally a reason);
  - the deletion happens **30 days later**, and the office can cancel until then;
  - a red notice shows the date, who asked, and whether an export was made first;
  - asking and exporting still work when the school is read-only.
- **On the date** (a daily job), everything that belongs only to this school is deleted:
  - every record in every module, uploaded files, the activity log, sign-in history and exports;
  - every sign-in account that belongs only to this school. Accounts that also work at another school, and the platform owner, are kept.

  The school row stays as an empty, inactive "Deleted school (CODE)" so that the platform's invoices and the proof remain.

**Platform owner** (All Schools page → Data deletions)

- Every request, with its status (scheduled, cancelled, deleted), who asked, the date and the reason.
- **Delete now**: carry out a scheduled deletion early, typing the school's name again.
- **Certificate of data deletion**: when, by whom, at whose request, and how many records, files and accounts were deleted, with a breakdown by kind. It can be printed.

**Built**

- Backend:
  - new app `services/core/portability`:
    - `SchoolExport` and `SchoolDeletion` (migration `0001`);
    - `data.py`: every record of a school from the tenant registry, the CSV, JSON and Excel builders, and the purge;
    - `api.py` and `urls.py` (`/api/v1/portability/`: overview, exports, download, deletion; certificate; the platform list and purge);
    - the command `run_data_lifecycle`;
  - export and deletion addresses are allowed while a school is read-only.
- Frontend:
  - `components/security/DataPanel.tsx` (a new Security & privacy tab);
  - `components/platform/PlatformDeletions.tsx` (with the certificate);
  - `services/portability.service.ts`;
  - a search shortcut.
- Fixed on the way: P12's invoices section on the All Schools page had been placed inside the price-list box. It now sits on its own, with the deletions below it.
- Tests:
  - `backend/tests/test_portability.py` has 3 new tests:
    - the full export in each format (only this school's records, no password columns, who may download, expiry after 7 days);
    - end-of-contract deletion (confirmation, cancel, reschedule, the platform owner deleting early; records, files, logs and single-school accounts gone; a shared account, the platform owner, the platform invoices and the other school kept; the certificate);
    - the daily job deletes on the date.
  - Passing: these plus the billing, invoice and security tests (21 passed), and the frontend type check.
- Browser check on the demo school (the database was restored afterwards):
  - the CSV zip (318 KB) and the Excel workbook (674 KB) each held 7,921 records and 246 people;
  - a wrong school name kept the delete button disabled;
  - scheduling showed "deleted on 26 Oct 2026", and cancel worked;
  - after scheduling again, the platform owner's **Delete now** produced the certificate: 8,061 records, 2 uploaded files and 245 sign-in accounts deleted.
  - No page errors.

---

## P14: Privacy Documents, Consent and Breach Response ✅

**Legal documents**

- **Public pages**, linked from the sign-in page: `/legal/privacy`, the platform's privacy notice; `/legal/terms`, the terms of use; `/legal/subprocessors`; `/legal/school/CODE`, a school's own privacy notice.
- Until the platform owner publishes, the privacy and terms pages show a **starting template**, marked as needing review by a lawyer.
- The **platform owner** reviews and publishes new versions (All Schools → Privacy notice and terms). The **school office** writes and publishes its own notice from a template with the school's name filled in (Security & privacy → Privacy & consent), and sees how many people have accepted each document.
- **Acceptance**: after a new version is published, everyone is shown it when they next sign in and must accept it to continue, with a note of what changed. The acceptance and IP address are recorded.

**Consent**

- Each school has consent questions. Two come ready: **Photos and videos**, asked for each child; **Anonymous usage statistics**, asked of each person. The office can add more (for example "School trips").
- **Privacy & consent** is a new page for parents, students and staff (in the Account section of the menu). Parents answer Yes or No for each child, can change their mind at any time, and see the history of each answer.
- If the office changes a question's wording, earlier answers are flagged and the family is asked again.
- **Report** for the office: yes, no and not answered for every student (or person), with who answered and when, and a CSV download.
- **Teachers see "No photos"** next to a child on the class roster and on the student profile when the family said no.

**Privacy requests**

- From Privacy & consent, anyone can ask the school to **see a copy** of their data, **correct** it, **limit** or **object to** its use, or **erase** it, for themselves or one of their children.
- Each request has a due date **one month** later. The office sees open requests with the deadline (overdue ones in red), replies, and marks them handled, completed or refused. Refusing needs a reason.
- The requester sees the status and the reply.

**Breach response**

- **Sub-processors**: the platform owner keeps the list (company, purpose, data, location, optional), and the public page shows it. It starts with the services this system is built to use: Render, Vercel, Stripe, OpenAI, Anthropic, Google, Microsoft and Twilio. Their locations are for the platform owner to fill in for their own accounts.
- **Report a problem** (school office): for example a lost device or an email to the wrong family. It creates an incident (INC-2026-001…) that the platform owner sees straight away.
- **Incident register** (platform owner):
  - severity, status, affected schools, data affected and number of people;
  - the **72-hour regulator deadline**, shown in red when overdue, with a "Regulator told now" record;
  - an 8-step **playbook** (contain, assess, record, regulator, schools, people, fix, review);
  - a **timeline** of notes;
  - **Tell affected schools**: emails each affected school's administrators and billing contact, and records it.
- Privacy actions (consent, requests) keep working when a school is read-only, and the P13 export and deletion now include the privacy records.

**Built**

- Backend:
  - new app `services/core/privacy`:
    - `LegalDocument`, `DocumentAcceptance`, `ConsentType`, `ConsentRecord`, `PrivacyRequest`, `SubProcessor`, `Incident` and `IncidentUpdate` (migrations `0001`, and `0002` for the starting sub-processor list);
    - `service.py`: templates, pending documents, current answers, photo consent, the playbook, telling schools;
    - `api.py` and `urls.py` (`/api/v1/privacy/`);
  - `privacy/` allowed while read-only;
  - export and deletion cover the privacy records.
- Frontend:
  - `pages/LegalPage.tsx` (public);
  - `components/privacy/AcceptanceGate.tsx` (in the main layout);
  - `pages/PrivacyConsentPage.tsx` (`/privacy`);
  - `components/privacy/PrivacyAdminPanel.tsx` (a new Security & privacy tab);
  - `components/platform/PlatformPrivacy.tsx`;
  - `components/privacy/PhotoConsent.tsx` (on the roster and the profile);
  - links on the sign-in page;
  - the menu item, translated into all 23 languages.
- Tests:
  - `backend/tests/test_privacy.py` has 5 new tests:
    - documents are published and accepted (template, platform and school versions, re-asking after a new version, the public sub-processor page);
    - consent per child and the report (only for your own children; history; teachers' photo flags; CSV; wording changes flag old answers; new questions);
    - privacy requests (deadline, refusing needs a reason, the reply reaches the requester, overdue);
    - incidents (school report, status and severity, playbook, emailing the schools, the 72-hour flag);
    - the export and deletion cover consent.
  - Passing: these plus the portability and billing tests (13 passed), the locale test and the frontend type check.
- A bug caught during the work: the photo flags came back as "not asked" for everyone because the answers were looked up by the wrong kind of ID. It is fixed and tested.
- Browser check on the demo school (the database was restored afterwards):
  - the sign-in page links worked, and the public privacy page showed the template;
  - the sub-processors page listed the 8 services;
  - the platform owner published the privacy notice, and the office published the school's notice;
  - the parent was asked to accept both, then answered "No" to photos for a child and sent a correction request, which the office completed with a reply;
  - the consent report showed 0 yes, 1 no and 119 not answered;
  - the office reported "Email sent to the wrong family" (INC-2026-001), and the platform owner ticked the first playbook step and told the school by email, which the timeline recorded;
  - on the teacher's roster, "No photos" showed next to the child who had no photo consent.
  - No page errors.

---

## P15: Help Centre and Support Tickets ✅

**What changed**
- **Help & support** is a new menu item for every role: office, teachers, parents and students. It opens a help centre:
  - **26 starter articles** (guides and questions with answers) written for this app's real menus: first steps, importing, who can do what, students and families, attendance, fees and online payment, marks and report cards, timetable, messages, payroll, the portal, passwords, two-step sign-in, plan and billing, export and privacy requests;
  - **each person sees only what fits their role**: parents and students get the portal, online payment and account articles, not the office's fee setup;
  - **search** (title matches rank first) and **topics**;
  - each article has related articles and **"Was this helpful?"** (one vote per person);
  - also in the search box ("help", "support", "ticket"…).
- **Support tickets** for school staff (administrators, teachers and office staff). Parents and students are asked to contact the school office instead.
  - A ticket has a subject, what it is about, how urgent it is, and a description. The page it was sent from is recorded.
  - **A first-reply promise by priority**: urgent 4 hours, high 1 day, normal 2 days, low 5 days.
  - Each ticket gets a number (#1001…), and the support team gets an email.
  - **Conversation**: replies from both sides; each side gets an email when the other replies.
  - The school can say **"It's sorted"**, or **"Not sorted after all"** to reopen it. A resolved ticket closes itself after a week (daily job).
  - **Who sees a ticket**: the person who opened it, their school's administrators, and the platform's support team. Other schools never do.
- **Support console** for the platform owner (All Schools page):
  - every school's tickets with **reply due** (late ones in red), priority, status and who is handling it;
  - counts: open, waiting for us, **reply overdue**, urgent;
  - **assign** to a member of the support team, change status and priority; every change is kept in the ticket's **history**;
  - **internal notes** that the school never sees, and **saved replies** (5 to start with);
  - the email link opens the right ticket.
- **Help articles editor** in the same console: add, edit, hide or delete articles, with topic, kind (guide, question, video link), who sees them, and the text ("## " heading, "- " bullet, "1. " step). Helpful and not-helpful counts show what needs improving.
- Tickets are part of the school's **full export** and its **end-of-contract deletion** (P13). Staging copies drop them. Support works for read-only schools (P11), and every role can reach it (P1).

**Built**
- Backend:
  - new app `services/core/support`:
    - `HelpArticle`, `SupportTicket`, `TicketMessage` and `CannedResponse` (migrations `0001`, and `0002` for the starter articles and saved replies from `help_content.py`);
    - `service.py` (who sees which help, search, reply promise, history, emails, who sees which ticket);
    - `api.py` and `urls.py` at `/api/v1/support/`;
    - commands `load_help_articles` (adds missing starter articles without overwriting edited ones) and `close_resolved_tickets` (daily);
  - `support/` added to the always-allowed personal (P1) and read-only (P11) lists;
  - export and deletion (P13) and staging (P5) cover tickets;
  - `SUPPORT_EMAILS` declared in `render.yaml`.
- Frontend:
  - `services/support.service.ts`;
  - `pages/help/HelpCentrePage.tsx` (`/help`, `/help/article/:slug`);
  - `pages/help/TicketsPage.tsx` (`/help/tickets`, `/help/tickets/:id`);
  - `components/support/ArticleBody.tsx`;
  - `components/platform/PlatformSupport.tsx`;
  - the menu item in all 23 languages, and search shortcuts.
- Tests:
  - `backend/tests/test_support.py` has 4 new tests:
    - help by role, search, topics, articles not for the role, one vote;
    - a ticket from start to finish (reply promise, email to support, parents refused, who sees it, internal notes hidden, reply email, school reply and "sorted", assignment to the support team only, history, closed tickets);
    - overdue replies, closing after a week, and the export including tickets;
    - the platform owner managing articles.
  - All 4 passed.
  - The full backend suite: 324 passed. Frontend: type check and 99/99 tests pass.
- Browser check on a copy of the demo database (separate ports):
  - the parent saw Help & support with the portal guide but not the office's fee setup, and was told to contact the school;
  - "pay fees" found "Paying fees online" first, and the vote was thanked;
  - the teacher opened a high-priority ticket;
  - the platform owner saw it with its reply-due time, added an internal note, replied with a saved reply and assigned it (all three in the history);
  - the teacher saw the support team's reply but not the note, replied, and marked it sorted;
  - the console then showed it as resolved, replied and assigned.
  - No page errors.

**Still yours** (in the checklist):
- optionally set `SUPPORT_EMAILS` (otherwise ticket emails go to the platform owners);
- add `close_resolved_tickets` to the daily jobs;
- review the starter articles and add your own.

## P16: Automated SMS and WhatsApp ✅

**What changed** (Communication → **SMS & WhatsApp**, administrators)
- **Automatic messages**, in the school's own words. These go out besides the email and portal notice from earlier phases:
  - **unexcused absence** (on by default once texts are set up), **late arrival** and **frequent absence** (off by default). They are sent when the register is saved;
  - **fee reminders**: sent with the Fee Defaulters "Send reminder" button and the monthly reminder run, to the guardians marked "Receives invoices";
  - **emergency messages** (below).
  - For each, the school chooses **SMS and/or WhatsApp**, switches it on or off, and edits the wording. Words in braces are filled in: `{student}`, `{class}`, `{date}`, `{minutes}`, `{count}`, `{amount}`, `{due_date}`, `{invoice}` and `{school}`. A mistyped word stays as typed, so it never stops an alert.
  - **Test SMS / Test WhatsApp** sends the wording, filled with example values, to any number.
- **Each alert goes to each number once**, however often the register is saved. Numbers come from the guardians marked "Receives school messages", or else the phone numbers on the student's form, converted to international format with the school's country code.
- **Emergency message**: for closures, weather or safety. It goes straight away to everyone, all families, all staff, or chosen classes:
  - as a **pinned announcement** (portal and email);
  - by **SMS and/or WhatsApp** to every number, including staff phones;
  - then it opens its own **delivery report**.
- **Delivery log**:
  - every text with its kind, student, number, channel, wording and **result** (queued, sent, delivered, read, not delivered), with the provider's reason when it fails;
  - filters, and counts for the last 7 days;
  - **Send failed ones again** (for an emergency message, or the ones shown).
  - Twilio's **delivery reports** update each text when the server's public address (`PUBLIC_API_URL`) is set. They are checked with the school's own auth token, so they can't be faked.
- **WhatsApp** uses the same Twilio account, from a WhatsApp-enabled Twilio number (**WhatsApp from** in Settings). Messages that start a conversation must match a template approved for that number in Twilio, as WhatsApp requires.
- The announcements' text messages (Phase 7) now go through the same sender, so they are in the log with their delivery status too.

**Fixes found on the way**
- **A new SMS setup was saved switched off**, so texts never went out and the page never said "Ready". The page sent back the "off" it received when the school had no settings yet. A new setup now starts switched on, and Settings has a clear **Texts switched on** tick box.
- **The AI assistant sometimes lost the previous answer in a conversation.** A question and its answer could be saved with the same time (the clock is coarse on Windows), and then came back in the wrong order. Each new turn is now always kept after the one before. This was also the cause of the occasionally failing AI test.

**Built**
- Backend:
  - `communication/texts.py` (rules and wording, family numbers, one Twilio sender for SMS and WhatsApp with delivery reports, no duplicates, fee and emergency texts, signed status updates);
  - `texts_api.py` at `/api/v1/auth/communication/texts/` (`rules/`, `log/`, `retry/`, `test/`, `emergency/`, `status/`);
  - `AutoTextRule`, plus the WhatsApp number, event, batch, error and dedupe fields (communication migration `0006`);
  - hooks in the attendance alerts (`register.send_notice`, in the background), the fee reminder button and `send_fee_reminders`;
  - `TWILIO_API_BASE` setting (only for testing);
  - `AIMessage.save` keeps turns in order.
- Frontend: `pages/messages/SmsPage.tsx`, rewritten with four tabs (Automatic messages, Emergency message, Delivery log, Settings), and the text functions in `messaging.service.ts`.
- Tests:
  - `backend/tests/test_texts.py` has 5 new tests, with Twilio replaced by a fake:
    - an absence alert by SMS and WhatsApp, sent once, with the delivery-report address; late arrivals off by default;
    - rules and wording (placeholders, empty wording refused, test send, office only);
    - a fee reminder with the amount and due date, once a day;
    - an emergency message: announcement, texts, a refused number in the log, retry, and signed and forged delivery reports;
    - nothing is sent without setup.
  - All 5 passed, plus the Phase 7 messaging tests (11 passed) and the AI tests (19 passed).
- Browser check, against a **local stand-in for Twilio** and a copy of the demo database (separate ports):
  - the office entered the Twilio and WhatsApp details, and the settings showed Ready;
  - the absence wording was changed, WhatsApp was ticked, and **Test SMS** arrived with the new wording ("…Ali Khan (Grade 5) was absent today…");
  - an absence alert for Ali Raza went by **SMS and WhatsApp** to both family numbers;
  - an emergency message to Grade 8 opened its delivery report, showing the refused number with the provider's reason;
  - **Send failed ones again** delivered it;
  - the log counted the texts.
  - No page errors.

**Still yours** (in the checklist):
- per school: the Twilio details (and a WhatsApp-enabled number with approved templates, if WhatsApp is wanted);
- set `PUBLIC_API_URL` for delivery reports;
- check the wording of the automatic messages.

## P17: Retention by Record Type ✅

**What changed** (Security & privacy → Rules & retention → **Keep records**)
- Phase 21 already removed old activity-log and sign-in records. Now each school also decides how long it keeps each kind of record, and what happens after. **Everything is kept until the school sets a time**, so nothing is removed on the live site until someone chooses to.
  - **Students who left or graduated** (counted from the day they left): **anonymised**.
    - removed: the name (it becomes "Former student <number>"), contacts, ID numbers, address, parents' details, the birth day (the year stays), health notes, immunisations and documents (with their files);
    - their guardians too, unless they still have a child at the school;
    - the student's portal login is switched off.
    - Marks, attendance and invoices stay, so the school's figures and accounts still add up.
  - **Deleted** after the chosen time: admission applications that did not enrol (declined or withdrawn); conversations between families and staff (from the last message); announcements; text and email delivery logs; attendance alerts and parents' absence notes (the attendance itself stays); paid or cancelled invoices with their payments.
  - **Minimum times** stop mistakes: invoices at least 5 years (accounting law usually asks for 6 to 7), students at least a year, delivery logs at least a month, others at least 3 months.
- **Before saving**: each row shows how many records the rule would remove tonight, and switching a rule on asks for confirmation ("…deleted for good").
- **The nightly job** (`apply_retention`, already on the daily list) now also applies these rules for every school. Each run is recorded in the school's activity log with what was removed, and `--dry-run` only counts.

**Built**
- Backend: `services/core/security/retention.py` (record types, minimums, actions, settings in the school's `settings_json`, preview, anonymising a student who left, apply, `/api/v1/security/retention/` for administrators); `apply_retention` extended.
- Frontend: `components/security/RetentionPanel.tsx` in the Rules & retention tab.
- Tests: `backend/tests/test_retention.py`, 3 new tests (nothing removed until the school decides; rules by record type incl. the guardian with a child still here kept and the portal login switched off; the office screen and the daily job with `--dry-run`). All passed.
- Browser check on a copy of the demo database: 7 record types, all set to keep; 2 years for invoices refused; 12 months for conversations confirmed and saved; the nightly job deleted the 500-day-old conversation, kept the recent one and recorded `{'messages': 1}` in the activity log.

**Still yours**: make sure `apply_retention` runs daily, and choose the school's times in Keep records when wanted.

## Fixes and additions after P17 (27 Sep 2026)

- **Test accounts on the sign-in page** while testing: a box lists the admin, teacher, parent and student test logins, and a click fills them in. It shows on a developer's computer, and on the live site only while `VITE_SHOW_TEST_LOGINS=true` is set in Vercel (remove it after testing; the live site refuses demo passwords anyway, P7).
- **Students list class filter**: choosing "Grade 10" showed "120 Students" in the class banner. The banner counted the whole school, and the filter matched loosely (a student with no class matched every class, and "Grade 1" would match "Grade 10"). It now matches the class exactly, and the banner and free seats count that class only (Grade 10: 20 students).
- **Library members**: there was no way to add members except searching for one person. **Add members** now gives library cards to a whole class, all students or all staff at once; the Members tab lists every card holder by default, with a "Books on loan" filter. Found on the way: the "books on loan" list also included members who had never borrowed anything. Fixed and tested (`test_library.py`, 5 passed).

# Part B — Deployment

## Deployment status

- **27 Sep 2026: all of P1–P17 pushed** to GitHub (`main`, up to `988910e`).
- The new **CI** (P5) ran on that push and **failed** (backend tests and the frontend install step). Because Render now deploys only after CI passes, **the live site was not updated** and still runs the version from `2a95d6d`. The failures are being fixed; after a green CI, Render deploys automatically and the live site is then tested.
- Before the live deploy, see the checklist below, in particular: a real password for the live admin account (demo passwords are refused on the live site, P7) or email set up so the reset link arrives, `FRONTEND_ORIGINS` (P6), and an authenticator app for the platform owner's two-step sign-in (P8).

## Deployment checklist

Things only you can do (accounts, keys, DNS, cron jobs). Ticked items are done.

These are done once, after all 22 modules are finished. Each phase adds to this list.

- [x] **Push** `main` to GitHub so Render and Vercel redeploy. Done on 26 Sep 2026: up to Phase 19 (`9fcf1dc`), then all 22 phases (`8bcfb14`).
- [x] **Migrate** on Render: nothing to do by hand. The `render.yaml` start command runs `python manage.py migrate` on every deploy, so pushing applies them. The new migrations:
  - students `0009`–`0015`;
  - admissions `0003`;
  - finance `0015`;
  - attendance `0009`;
  - academics `0025`–`0026`;
  - gradebook `0001`;
  - communication `0005`;
  - calendar `0001`;
  - behaviour `0003`–`0004`;
  - library `0001`, transport `0001`, inventory `0001`, cafeteria `0001` and integrations `0001`;
  - audit `0004`, security `0001`, and the sign-out token tables (`token_blacklist`, from simplejwt).
- [x] **New Python package**: `segno` (library QR labels) is in `requirements.txt`, which the Render build installs on every deploy.
- [ ] **Paid database and durable backups** (P2):
  - move `erp-db` in `render.yaml` from `plan: free` to a paid plan (free Render databases expire);
  - set `BACKUP_S3_BUCKET`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (a private bucket), plus `BACKUP_ENCRYPTION_KEY` (a Fernet key);
  - add a daily cron job `python manage.py backup_database` and a weekly one `python manage.py backup_database --verify`;
  - keep a copy of `BACKUP_ENCRYPTION_KEY` somewhere safe outside Render: without it, backups can't be opened.
- [ ] **Daily cron jobs on Render**. The free plan has no cron jobs: add Render Cron Job services (paid, from about $1 a month each) with the backend's environment, or move to a paid plan. Until then these don't run:
  - `python manage.py send_scheduled_announcements`;
  - `python manage.py send_calendar_reminders`;
  - `python manage.py send_library_reminders`;
  - `python manage.py apply_retention` (deletes activity-log and sign-in records older than each school's rules);
  - `python manage.py run_platform_billing` (issues subscription invoices coming due and sends payment reminders);
  - `python manage.py run_data_lifecycle` (carries out school deletions whose date has come and removes expired exports).
- [ ] **Push the security fixes soon** (Phase 21). The live site (up to Phase 19) still has the holes Phase 21 closed:
  - exam results readable and writable without signing in;
  - the fee defaulter list public;
  - the demo login endpoint;
  - teachers with Django's staff flag treated as administrators.
- [ ] **App addresses** on Render (now declared in `render.yaml`; enter the values in the Render dashboard):
  - `FRONTEND_ORIGINS`: the web app address(es), e.g. `https://your-app.vercel.app`. Microsoft sign-in and Google Classroom only ever return people there.
  - `PUBLIC_API_URL`: the backend's public `https://` address, so the sign-in return addresses shown to schools use https.
- [ ] Optional, on Render: `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` for one Google Classroom app shared by every school. Otherwise each school enters its own.
- [ ] **Sending domain** (P3), for the email provider's domain: add the SPF and DKIM records the provider gives you, and a DMARC record (start with `v=DMARC1; p=none; rua=mailto:you@yourdomain`). Without them, password-reset emails often land in spam.
- [ ] **Email** on Render (declared in `render.yaml`, port 587 preset; enter the values in the dashboard): `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` and `DEFAULT_FROM_EMAIL` (for example Google Workspace, SendGrid or Mailgun SMTP).
- [ ] **Security scanning** (P9): in GitHub → Settings → Code security, switch on Dependabot alerts and Dependabot security updates. After the first push, check that the **Security scan** workflow is green, and look at Security → Code scanning for any CodeQL findings. Later, upgrade `react-router` to 7 (the last 5 moderate npm advisories).
- [ ] **Test accounts on the sign-in page**: shown on your own computer, and on the live site only while `VITE_SHOW_TEST_LOGINS=true` is set in Vercel. Remove that setting when testing is finished. The live site refuses demo passwords anyway (P7), so give the live admin account a real password.
- [ ] **Two-step sign-in** (P8): the platform owner is asked to set it up at the first sign-in on the live site. Have an authenticator app ready (Google or Microsoft Authenticator, 1Password…) and keep the recovery codes safe. Schools can require it for their administrators in Security → Rules.
- [ ] **Live site settings** (P7): after the deploy, open All Schools → Live site settings and fix what it lists: `BACKUP_ENCRYPTION_KEY`, the backup bucket, email, `ERROR_ALERT_EMAILS`, any demo accounts, and removing `ADMIN_PASSWORD` once you have signed in. To change a key later, follow `docs/KEY_ROTATION.md`.
- [ ] **Web app address** (P6): set `FRONTEND_ORIGINS` on Render to the web app's address(es), comma-separated (for example `https://your-app.vercel.app,https://erp.yourschool.com`). Only those pages may then call the API. Until it is set, any `*.vercel.app` or `*.onrender.com` page may. If sign-in history shows the same address for everyone, set `TRUSTED_PROXIES` to 2.
- [ ] **Pipeline and staging** (P5):
  - delete `.github/workflows/backup.yml`. It fails on every push, and real backups are the app's own (P2);
  - in Render → erp-backend → Settings, check that Auto-Deploy is "After CI checks pass". The blueprint sets it; older services may need it set by hand;
  - optional staging: first set `BACKUP_ENCRYPTION_KEY` on the live site (so another site can read its backups); then in Render go to New → Blueprint → path `deploy/render-staging.yaml` and fill `STAGING_PASSWORD`, `STAGING_SOURCE_BACKUP=latest`, the backup bucket, the AWS keys, `BACKUP_ENCRYPTION_KEY`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`; in Vercel, set `VITE_API_URL` and `VITE_APP_ENV=staging` for the `staging` branch.
- [ ] **Error alerts and uptime** (P4):
  - set `ERROR_ALERT_EMAILS` on Render (comma-separated). Without it, alerts go to the superusers;
  - optionally set `SENTRY_DSN`;
  - add a free uptime monitor (for example UptimeRobot) on `https://erp-backend-s5z7.onrender.com/api/v1/health/live/` and on the web app's address;
  - after a push, check that the GitHub **Deploy check** turns green.
- [ ] **Platform billing** (P12, declared in `render.yaml`):
  - `PLATFORM_STRIPE_SECRET_KEY` and `PLATFORM_STRIPE_WEBHOOK_SECRET`, with the webhook address `…/api/v1/billing/stripe/webhook/` added in Stripe;
  - `PLATFORM_BANK_DETAILS` (shown for bank transfer);
  - `PLATFORM_LEGAL_NAME`, `PLATFORM_ADDRESS` and `PLATFORM_TAX_ID` (printed on invoices);
  - tax rules per country in the platform console.
- [ ] **Card payments** (per school): Fees → Online Payments, paste the Stripe secret key and webhook signing secret, and add the webhook address shown there in Stripe.
- [ ] **SMS** (per school): the Twilio SID, auth token, sending number and country code under Communication.
- [ ] **Library barcodes**: scan a printed label with the school's own barcode scanner. They are unit-tested but not yet tried on a real scanner.
- [ ] **Demo school**: set up School Years and Terms, so Progress and term pages show real terms.
- [ ] Later, with the mobile apps (phase 42–43): live GPS tracking of school buses.

---

# Part C — Pending: Future Upgrade Plan

What is left, in the agreed order of priority. Each item says what to build, why, what already exists to build on, and when it should be done. Numbers in brackets are the original roadmap items (Part D).

## Tier 2: Growth and Daily-Use Quality

After the first paying schools are live and stable. These improve daily use and keep schools.

### P18: Installable web app and offline attendance

**Roadmap items:** 42, 44

**What to build**
- App manifest, icons and splash screen, so the web app installs on phones and tablets ("Add to home screen").
- A service worker with an offline app shell, and push notifications (attendance alerts, messages, announcements) with the user's permission.
- Offline attendance for teachers: mark the register without internet, keep it on the device, sync when back online, and show what is waiting to sync; clashes (the office changed the same day) are shown, not overwritten.

**Why it matters**
- Many classrooms have weak internet; teachers stop using a register that fails. Parents expect phone notifications.

**Builds on**
- Phase 4 (attendance codes and the daily register), Phase 7 (portal notices), P6 (the CSP allows service workers from the app itself).

**When**
- First item after the live deploy has settled.

### P19: Pilot schools and feedback loop

**Roadmap items:** M17, M16, 81

**What to build**
- 3 to 5 pilot schools per market, with an onboarding call, import help (P10) and a named contact.
- Feedback inside the app (a short form on every page that files a support ticket, P15) and a 30/60/90-day check-in plan with notes per school.
- A simple health view per school: last sign-ins, modules used, open tickets.

**Why it matters**
- Real schools find the problems tests don't; early feedback decides what to build next.

**Builds on**
- P10 import, P15 help centre and tickets, P11 plans and trials.

**When**
- Alongside the first paying schools.

### P20: Product analytics, release notes and status page

**Roadmap items:** 37, 39, 36

**What to build**
- Feature use per school (which modules and pages are used, how often), without tracking students or storing personal data; respects the P14 usage-statistics consent.
- A "What's new" page and a notice after each release, by module.
- A public status page (uptime from the P4 monitor, incidents and planned maintenance).

**Why it matters**
- Shows what schools actually use, tells them about improvements, and answers "is it down?" without a ticket.

**Builds on**
- P4 error tracking and uptime, P14 consent, P15 help centre.

**When**
- After P19, once there are several schools.

### P21: Accessibility audit and conformance report

**Roadmap items:** 69, 70

**What to build**
- A full WCAG 2.1 AA check of every page (keyboard use, screen readers, contrast, focus, forms, error messages), not just the navigation done in Phase 22.
- Fix what is found, add automated accessibility checks to CI (P5), and publish an Accessibility Conformance Report (VPAT).

**Why it matters**
- Required by many public and international schools and by law in several countries; also makes the app easier for everyone.

**Builds on**
- Phase 22 navigation, the Phase 18 accessible charts, P5 CI.

**When**
- Before selling to public-sector or US/EU schools.

### P22: Sales CRM and market pages

**Roadmap items:** 38, 80, M18

**What to build**
- A simple pipeline for leads, demos, trials and renewals, linked to P11 trials and P12 invoices.
- Public pricing pages per market, a demo school to try without signing up, and case studies from pilot schools.

**Why it matters**
- Turns interest into paying schools and makes renewals visible before they lapse.

**Builds on**
- P11 plans and trials, P12 platform invoices, the Phase 20 region styles.

**When**
- When actively selling in more than one market.

### P23: Public API and webhooks

**Roadmap items:** 40, 41

**What to build**
- API keys per school with scopes, rate limits and versioned, documented endpoints (the OpenAPI schema already exists).
- Webhooks for student, attendance, payment and admission events, with signed deliveries, retries and a delivery log.

**Why it matters**
- Larger schools and partners want to connect their own systems without manual exports.

**Builds on**
- The existing REST API and schema, P6 rate limits, the P16 delivery-log pattern.

**When**
- When a school or partner asks for an integration.

## Tier 3: When Entering a New Country

Do the items for a market only when a school there is signing.

### P24: International academic structures

**Roadmap items:** 50

**What to build**
- Presets for UK year groups and key stages, US grades and credits, European grading scales, and Pakistani boards (matric/intermediate), set per school.

**Why it matters**
- Schools expect their own structure and grade names out of the box.

**Builds on**
- Phase 5 years and terms, Phase 6 grading scales, Phase 20 region styles.

**When**
- With the first school in a new education system.

### P25: Remaining localisation

**Roadmap items:** rest of 47–49, 51, M11

**What to build**
- Translation management (missing strings, review), number formats, daylight-saving checks for reminders and timetables, and legal texts per country and language.

**Why it matters**
- Mistranslations and wrong times erode trust; legal texts must match the country.

**Builds on**
- The 23 languages, the Phase 20 region styles, the P14 legal documents.

**When**
- Per new language or country.

### P26: EU and UK readiness

**Roadmap items:** 65, 52 (EU region), 66

**What to build**
- An EU data region (database, files and backups in the EU), DPA and DPIA support, UK Children's Code settings, and AI transparency notices.

**Why it matters**
- Required to sell to EU and UK schools under GDPR / UK GDPR.

**Builds on**
- P13 export and deletion, P14 privacy documents and breach playbook, P17 retention.

**When**
- Before the first EU or UK school.

### P27: AI governance and privacy

**Roadmap items:** 78, 79

**What to build**
- AI on or off per school and per feature, usage limits, an AI activity log, teacher confirmation for AI suggestions, masking of personal data sent to the AI, and zero-retention providers where available.

**Why it matters**
- Schools and regulators expect control over AI use with children's data.

**Builds on**
- The existing AI assistant with its quotas (P11 includes the AI module per plan).

**When**
- Before EU schools, or when a school asks.

### P28: US readiness

**Roadmap items:** 67, 68, 74, 75

**What to build**
- FERPA and COPPA controls (directory information settings, disclosure logs, parental consent), the NDPA and state addenda, Clever and ClassLink sign-in, and OneRoster rostering.

**Why it matters**
- US districts will not sign without these.

**Builds on**
- P14 consent, Phase 21 audit log, Phase 17 SSO pattern.

**When**
- Before the first US school.

### P29: Remaining Google and Microsoft integration

**Roadmap items:** rest of 72, 73

**What to build**
- Account sync from Google Workspace and Microsoft 365, and calendar sync both ways.

**Why it matters**
- Saves the office re-typing staff and students.

**Builds on**
- Phase 17 Microsoft sign-in and Google Classroom.

**When**
- When schools on those platforms ask.

### P30: LMS and district data

**Roadmap items:** 76, 77

**What to build**
- LTI 1.3 launch from learning platforms (Moodle, Canvas…) and Ed-Fi data exchange for districts.

**Why it matters**
- Needed where schools already use an LMS or report to a district.

**Builds on**
- P23 public API.

**When**
- On demand.

## Tier 4: Enterprise Scale and Certification

### P31: Native mobile apps

**Roadmap items:** 43, 45, 46, M12

**What to build**
- Parent, student and teacher apps (or one app with roles): push notifications, attendance, fees, grades, homework, messages, calendar; Apple and Google sign-in, biometric unlock; bus GPS tracking for Phase 14.
- App-store privacy details, age ratings and staged releases.

**Why it matters**
- Families expect an app; the installable web app (P18) covers most needs until then.

**Builds on**
- P18, the existing API, Phase 14 transport.

**When**
- When scale justifies app-store upkeep.

### P32: High availability and infrastructure as code

**Roadmap items:** 55, 54, 52

**What to build**
- Several app instances with load balancing, a CDN, object storage for all files, infrastructure as code (Terraform) and repeatable regional deployments.

**Why it matters**
- Needed for larger schools and uptime promises in contracts.

**Builds on**
- P2 durable backups, P5 staging, P4 monitoring.

**When**
- When load or contracts need it.

### P33: External penetration test

**Roadmap items:** M6

**What to build**
- An independent security test of the web app and API, then fixing what is found.

**Why it matters**
- Buyers and insurers ask for it; finds what internal checks miss.

**Builds on**
- P6–P9 hardening and scanning.

**When**
- Before international expansion.

### P34: Trust centre and incident management

**Roadmap items:** 82, 83

**What to build**
- A public page with security and privacy information, sub-processors, status and certifications; on-call runbooks and post-incident reviews.

**Why it matters**
- Answers security questionnaires and speeds up sales.

**Builds on**
- P14 sub-processors and incident register, P4, P20 status page.

**When**
- With P33.

### P35: ISO 27001 / SOC 2 and continuous compliance

**Roadmap items:** 71, 84, M7, 60 (immutable records)

**What to build**
- Written policies, staff security training, quarterly access reviews, yearly penetration tests and DPIA reviews, vendor reviews, and tamper-proof audit records.

**Why it matters**
- Required by large schools, districts and groups.

**Builds on**
- Phase 21 audit log, P2 restore tests, P33, P34.

**When**
- When selling to large groups.

# Part D — Original Roadmap Reference Table (Phases 23–84)

The 23–84 list and the missing items M1–M19 (below) are put in order of urgency, based on what phases 1–22 already built and what the live site showed. Numbers in brackets are the original item numbers. The original table stays below for reference.

**What changed the order:**

- **Some items are already largely done** by phases 1–22:
  - multi-school separation (23);
  - languages, currencies, time zones and region wording (47–49, 51);
  - account lockout and sign out everywhere (most of 56);
  - the audit trail (60);
  - retention for logs (61);
  - data download and deletion requests (part of 62);
  - Microsoft and Google Classroom (part of 72–73);
  - accessible navigation (part of 69).

  Only what's missing from these remains.
- **The live site went weeks without deploying and nobody noticed.** Monitoring and a test-and-deploy check move to the top.
- **"Forgot password?" is broken.** The sign-in page calls an address the server doesn't have (it answers 404), so users can't reset their own password. Password-reset email moves to the top.
- **The database is on Render's free PostgreSQL, which expires.** The app then falls back to a temporary file, which is lost on restart. No backups exist. This must be fixed before any real school's data goes in.
- **Phase 21 found many endpoints open to anyone.** The same check is still needed for signed-in people reaching other roles' data, for example a parent calling admin endpoints.

### Tier 0: Critical, before any real school's data goes in

| Order | Item | What to do |
| ---: | --- | --- |
| **P1** | Production readiness [M1] | Check every endpoint as each role (parent, student, teacher, staff) for data they shouldn't reach. Remove the leftover mock screens, placeholder buttons and browser-storage "data". Fix the 4 known failing tests. |
| **P2** | Database safety and backups [53, M3] | Paid managed PostgreSQL (no expiry). Turn off the temporary-file fallback in production. Daily encrypted backups and one real restore test. |
| **P3** | Password reset and transactional email [32] | Working "Forgot password?" by email, email verification, invoice and notice emails, templates, SPF, DKIM and DMARC for the sending domain. |
| **P4** | Error tracking and uptime monitoring [34, 35] | Frontend and backend error reports with school and user context. Uptime and deploy-failure alerts, so a failed deploy is noticed the same day. |
| **P5** | Test-and-deploy pipeline and staging [M19, M2] | Tests run on every push and block a broken deploy. A staging site with anonymised data. A short release checklist. |
| **P6** | Web security hardening and rate limits [57, M4] | Security headers (CSP, HSTS, frame protection), strict CORS, secure cookies. Rate limits on sign-in, signup, password reset and the AI assistant. |
| **P7** | Secrets and default passwords [59] | Remove demo and shared passwords (`Admin@123` and so on) from anything live. Keys kept only in Render's environment. A key-rotation note. |
| **P8** | Two-step sign-in for administrators [rest of 56] | TOTP codes (authenticator app) for admins and the platform owner, with recovery codes. |
| **P9** | Dependency and code scanning [58, M5] | pip-audit, npm audit and CodeQL (or GitHub's built-in scanning) on every push. |

### Tier 1: To take on the first paying schools

| Order | Item | What to do |
| ---: | --- | --- |
| **P10** | School onboarding and data import [27, 31, M15] | Setup checklist and first-login wizard. Bulk import of students, parents, staff, classes and opening fee balances, with preview, duplicate detection and an error report. |
| **P11** | SaaS plans and subscriptions [24] | Plans, student and module limits, trials, renewals, upgrade and downgrade, and what a school sees when a subscription lapses. |
| **P12** | Platform payments and invoices [25, 26, M13, M14] | Card payments for subscriptions, platform invoices, payment history, failed-payment retries and reminders (read-only mode, then suspension), and tax details (VAT and sales tax, tax IDs). |
| **P13** | Full school export and end-of-contract deletion [28, M10] | One complete export (CSV, Excel, JSON) and deletion or anonymisation when a contract ends, with proof. |
| **P14** | Privacy documents, consent and breach response [62, 63, 64, M8, M9] | Privacy notice and terms, consent records (photos, optional services), correction and restriction requests, a sub-processor list, and a breach-response playbook. |
| **P15** | Help centre and support tickets [29, 30] | Searchable help by role, and support tickets with priority, status and history. |
| **P16** | Automated SMS and WhatsApp [33] | Absence alerts, fee reminders and emergency messages through templates, with delivery status (building on phase 7). |
| **P17** | Retention by record type [rest of 61] | Rules for students who left, old invoices and messages (archive or anonymise), extending phase 21's log retention. |

### Tier 2: Growth and daily-use quality

| Order | Item | What to do |
| ---: | --- | --- |
| **P18** | Installable web app and offline attendance [42, 44] | App manifest, icons, offline shell, push notifications. Teachers can mark attendance offline and it syncs later. |
| **P19** | Pilot schools and feedback loop [M17, M16, 81] | 3–5 pilot schools, feedback collection, 30/60/90-day check-ins. |
| **P20** | Product analytics, release notes, status page [37, 39, 36] | Feature use per school (without tracking students), a What's New page, and a public status page. |
| **P21** | Accessibility audit [69, 70] | Full WCAG 2.1 AA check of every page (phase 22 covered navigation), then a conformance report (VPAT). |
| **P22** | Sales CRM and market pages [38, 80, M18] | Leads, demos and trials pipeline, pricing pages, demo school, case studies. |
| **P23** | Public API and webhooks [40, 41] | Per-school API keys, rate limits and documentation. Webhooks for student, attendance, payment and admission events, with retries and delivery logs. |

### Tier 3: When entering a new country

Do the items for a market only when a school there is signing.

| Order | Item | What to do |
| ---: | --- | --- |
| **P24** | International academic structures [50] | UK Year groups, US grades, European grading scales and Pakistani boards as configurable presets. |
| **P25** | Remaining localisation [rest of 47–49, 51, M11] | Translation management, number formats, daylight-saving checks, country legal texts. |
| **P26** | EU and UK readiness [65, 52 (EU region), 66] | EU data region, DPA and DPIA support, UK Children's Code, AI transparency. |
| **P27** | AI governance and privacy [78, 79] | AI on or off per school, usage limits, AI logs, teacher confirmation, data masking, zero-retention providers. |
| **P28** | US readiness [67, 68, 74, 75] | FERPA and COPPA controls, directory information, disclosure logs, NDPA. Clever and ClassLink SSO, OneRoster. |
| **P29** | Remaining Google and Microsoft [rest of 72, 73] | Account sync, calendar sync. |
| **P30** | LMS and district data [76, 77] | LTI 1.3, Ed-Fi. |

### Tier 4: Enterprise scale and certification

| Order | Item | What to do |
| ---: | --- | --- |
| **P31** | Native mobile apps [43, 45, 46, M12] | Parent, student and teacher apps. Apple and Google sign-in, biometrics. App-store privacy details and staged releases. |
| **P32** | High availability and infrastructure as code [55, 54, 52] | Several app instances, CDN, object storage, Terraform, regional deployments. |
| **P33** | External penetration test [M6] | Before international expansion, after P6–P9. |
| **P34** | Trust centre and incident management [82, 83] | Public security and privacy page, on-call runbooks, affected-school notifications. |
| **P35** | ISO 27001 / SOC 2 and continuous compliance [71, 84, M7, 60 (immutable records)] | Policies, staff training, access reviews, yearly tests and reviews. |


---

# Part E — Missing Items M1–M20

| Missing # | Area | What is missing / should be added | Why it matters | Suggested position |
| --- | --- | --- | --- | --- |
| M1 | Core Product | Production Readiness / Core Functional Completion | LocalStorage migration, fixing broken buttons, removing placeholder actions, fixing known bugs and tests are not clearly represented as their own upgrade item. | Before 23 |
| M2 | Infrastructure | Staging Environment | Separate staging environment with anonymized data is explicitly required in the full plan but not clearly represented in 23–84. | After 52 |
| M3 | Infrastructure | Automated Backup & Restore Testing | Backups are mentioned inside Disaster Recovery, but the Lean plan specifically requires a restore test before the first paying school. | With 53 |
| M4 | Security | Rate Limiting | Login, signup, password reset and AI endpoint rate limits are explicitly required but are not clearly named in the 23–84 list. | With 57 |
| M5 | Security | Dependency / Container / Code Scanning | pip-audit, npm audit, Trivy and CodeQL are specifically mentioned in the full plan. | With 58 |
| M6 | Security | External Penetration Testing | The Lean roadmap specifically includes an affordable external security test before international expansion. | With 58 |
| M7 | Security | Security Policies & Staff Security Training | Required later for SOC 2/ISO and continuous compliance, but currently only partially covered. | With 71/84 |
| M8 | Privacy | Sub-Processor Management | International privacy readiness requires maintaining a list of hosting, email, AI, support and analytics providers and managing changes. | With 64/65 |
| M9 | Privacy | Breach Response & Notification | A dedicated breach-response workflow/playbook is not clearly represented in the 23–84 list. | With 64/65 |
| M10 | Privacy | Contract-End Data Deletion | Exporting/deleting data at the end of a school's contract is specifically required. | With 61/62 |
| M11 | International | Legal Documents by Country | Country/language-specific privacy notices, terms and legal texts are explicitly part of internationalization. | With 47–51 / 65 |
| M12 | Mobile | App Store Compliance & Release Pipeline | Apple privacy details, Google Data Safety, age rating, privacy manifest and staged releases are separate operational requirements. | With 43–46 |
| M13 | Payments | Failed Payment / Dunning Workflow | Payment retries/reminders and read-only/suspension rules are not fully represented by Online Payment Gateway + Subscription Billing. | With 24–26 |
| M14 | Payments | Tax Handling | VAT, sales tax, tax IDs and regional tax handling are mentioned in the full roadmap but not explicitly in the 23–84 list. | With 25/26 or 48 |
| M15 | Operations | School Onboarding / Migration Workflow | Import exists, but the complete onboarding process—setup checklist, configuration and guided setup—is broader. | With 27/31 |
| M16 | Operations | Customer Feedback / Product Feedback Loop | The launch plan explicitly includes collecting pilot feedback and using it for product improvement. | With 80/81 |
| M17 | Business | Pilot School Program | 3–5 pilot schools per new market are explicitly part of the launch strategy. | With 80 |
| M18 | Business | Market-Specific Sales & Pricing | International websites, pricing pages, demos and case studies are mentioned, but this deserves a clearer sales-readiness item. | With 80 |
| M19 | Operations | Release / Deployment Process | The Lean plan requires a regular tested production deployment and release-note workflow. | With 39 + 55 |
| M20 | Business | Ongoing Vendor / Third-Party Review | Sub-processors, support tools, AI providers, hosting and analytics need recurring review. | With 82–84 |

---

# Part F — Final Sequence Overview

So the overall roadmap becomes:

- **1–22:** Core school-system modernization (COMPLETED)
- **P1–P9:** Tier 0 — Critical production readiness (COMPLETED)
- **P10–P14:** Tier 1 (first part) — SaaS business readiness (COMPLETED)
- **P15–P17:** Tier 1 (remaining) — Help, SMS, Retention (COMPLETED)
- **P18–P23:** Tier 2 — Growth and daily-use quality (PENDING)
- **P24–P30:** Tier 3 — When entering a new country (PENDING)
- **P31–P35:** Tier 4 — Enterprise scale and certification (PENDING)

This keeps the original **22 modules untouched** and puts the additional work into the **next upgrade phase**, rather than repeating Student Records, Admissions, Billing, Attendance, Academics, Gradebook, Communication, Calendar, etc.

---
