# Upgrade to international standard: progress

We are working through phases 1 to 19 in order. Phases 20 to 22 come later.
Each phase is marked done only after it passes its backend tests and a browser check. The notes for each finished phase are under **Progress log** below the table.

|  Phase | Module                          | Current Pakistani-Style System                                                                 | Upgrade to International Standard      | Key Features to Implement                                                                                                                                                                            | Priority         | Status |
| ----: | --- | --- | --- | --- | --- | --- |
|  **1** | **Student & Household Records** | One flat student form with `father_*`, `mother_*`, caste, orphan status, B-Form, family income | **Household-based student management** | Student profile, household/family, multiple guardians, custody details, pickup permissions, billing parent, communication parent, health information, allergies, immunizations, student profile tabs | 🔴 **1 — First** | ✅ Done |
|  **2** | **Admissions**                  | Office staff manually enters student application                                               | **Online admissions workflow**         | Public application form → application review → approve/reject → enrollment → document upload → e-signatures → yearly re-enrollment                                                                   | 🔴 **2**         | ✅ Done |
|  **3** | **Fees / Billing**              | Monthly challans, paid slips, manual fee records, delete fees                                  | **Complete tuition billing system**    | Invoices, fee structures, payment plans, family statements, online payments, reminders, credits, refunds, payment history, challan support for Pakistan                                              | 🔴 **3**         | ✅ Done |
|  **4** | **Attendance**                  | Simple Present/Absent per day                                                                  | **Advanced attendance management**     | Present, absent, tardy, excused, unexcused, period-wise attendance, attendance history, automatic parent alerts                                                                                      | 🔴 **4**         | ✅ Done |
|  **5** | **Academics / Classes**         | Basic classes and subjects                                                                     | **Academic structure**                 | Academic years, terms/semesters, grades, sections, subjects, teachers, courses, class schedules, student enrollment                                                                                  | 🔴 **5**         | ⏳ Next |
|  **6** | **Gradebook**                   | Exam marks → award list → marksheet                                                            | **Modern digital gradebook**           | Assessment categories, weighted grades, assignment/exam marks, GPA, grading scales, report cards, transcripts, standards-based grading                                                               | 🔴 **6**         | Not started |
|  **7** | **Communication**               | Notices and WhatsApp                                                                           | **Two-way school communication**       | Parent-teacher messaging, announcements, email, SMS, notifications, communication history, targeted messages                                                                                         | 🟠 **7**         | Not started |
|  **8** | **Calendar & Events**           | Basic notices/date sheet                                                                       | **School-wide calendar**               | Academic calendar, holidays, exams, events, meetings, deadlines, parent/student calendar, reminders                                                                                                  | 🟠 **8**         | Not started |
|  **9** | **Behaviour / Discipline**      | Affective and psychomotor ratings                                                              | **Behaviour management**               | Discipline incidents, incident categories, actions, warnings, follow-ups, positive points/rewards, behaviour history                                                                                 | 🟠 **9**         | Not started |
| **10** | **Student Portal**              | Basic student information/results                                                              | **Complete student/family portal**     | Profile, attendance, grades, assignments, fees, invoices, messages, calendar, documents, academic progress                                                                                           | 🟠 **10**        | Not started |
| **11** | **Parent Portal**               | Limited parent information                                                                     | **Family/Parent Portal**               | Multiple children under one account, fees, attendance, grades, communication, calendar, applications, documents                                                                                      | 🟠 **11**        | Not started |
| **12** | **Teacher Portal**              | Basic teacher functionality                                                                    | **Teacher Workspace**                  | Classes, attendance, gradebook, assignments, student profiles, messaging, calendar, reports                                                                                                          | 🟠 **12**        | Not started |
| **13** | **Library**                     | Basic or missing                                                                               | **Library Management**                 | Books, copies, QR/barcodes, issue/return, reservations, overdue tracking, member records                                                                                                             | 🟡 **13**        | Not started |
| **14** | **Transport**                   | Basic transport information                                                                    | **Transport Management**               | Routes, stops, buses, drivers, students, pickup/drop-off, assignments, transport notifications                                                                                                       | 🟡 **14**        | Not started |
| **15** | **Inventory**                   | Missing/basic                                                                                  | **Inventory Management**               | Items, categories, suppliers, stock in/out, low-stock alerts, purchase records, inventory reports                                                                                                    | 🟡 **15**        | Not started |
| **16** | **Cafeteria**                   | Missing                                                                                        | **Cafeteria Management**               | Menu, meal plans, student purchases, balances, transactions, reports                                                                                                                                 | 🟡 **16**        | Not started |
| **17** | **Integrations**                | Limited integrations                                                                           | **External integrations**              | Google Classroom, Google Workspace, Microsoft 365, email/SMS providers, payment gateways, SSO                                                                                                        | 🟢 **17**        | Not started |
| **18** | **Reports & Analytics**         | Basic reports                                                                                  | **Advanced analytics dashboard**       | Enrollment trends, attendance analytics, fee collection, academic performance, teacher/class reports, financial reports                                                                              | 🟢 **18**        | Not started |
| **19** | **Global Search**               | Search within individual modules                                                               | **Global search**                      | Search students, parents, teachers, invoices, applications, books, transport records from one place                                                                                                  | 🟢 **19**        | Not started |
| **20** | **Regionalization**             | Pakistani terminology everywhere                                                               | **Region Style System**                | Pakistan / International-US setting, terminology, currency, date format, forms, payment methods and workflows                                                                                        | 🟢 **20**        | Later |
| **21** | **Privacy & Security**          | Basic authentication/roles                                                                     | **Enterprise-grade security**          | RBAC, audit logs, permissions, data access controls, SSO, privacy settings, configurable retention policies                                                                                          | 🟢 **21**        | Later |
| **22** | **UI/UX & Navigation**          | ~15 flat menu items with terms such as Challan, Date Sheet, Award List                         | **Modern grouped navigation**          | People, Academics, Gradebook, Attendance, Billing, Admissions, Communication, Reports + global search                                                                                                | 🟢 **22**        | Later |

## Progress log

### Phase 1: Student & Household Records ✅

**What a school can now do**
- Keep each student in a **household** (family), with the family address, phone and email, and see all children and guardians of a family together.
- Add **any number of guardians** per student (mother, father, step-parents, grandparents, legal guardian, foster parent and others), with phone, email, work details and national ID.
- Set **per-student permissions** for each guardian: primary contact, lives with the student, legal custody, **allowed to pick up**, emergency contact and call order, **receives invoices**, **receives school messages**, parent portal access.
- Record **custody notes** (for example a court order). The student's page shows a warning badge when someone is not allowed to pick up.
- Reuse a guardian who is already on file (for example for a sibling) instead of typing them again. The form suggests matches as you type.
- Keep a **health record**: allergies (with a "severe allergy" warning on the profile), medical conditions, medications, dietary needs, doctor, insurance and consent to emergency treatment.
- Record **immunizations** (vaccine, dose, date, or an exemption with its reason).
- See a **tabbed student page**: Overview, Family & guardians, Health, Attendance (present, absent, tardy, excused), Billing (balance and recent invoices, and who is billed) and Grades.
- Browse and search the **Households** directory (Students → Households) by family, guardian or student name, ID, phone or email, and see each family's total balance.

**Pakistani flow is kept**
- The classic student form (father/mother fields, B-Form, caste and so on) still works unchanged.
- Every student saved through it automatically gets a household and guardian records. Siblings are grouped by the father's (or else the mother's) CNIC, the same rule the old family directory used.
- Existing students were converted once when the update was installed (locally: 121 students into 120 households).
- Pakistan-specific fields only appear on the profile when they are filled in.

**Who can do what**
- School admins can add and change families, guardians and health records, and see the household directory.
- Teachers, parents and students can view a student's profile only when they are already allowed to see that student. They cannot change it.
- Each school only ever sees its own households and guardians.

**Built**
- Backend: `Household`, `Guardian`, `StudentGuardian`, `StudentHealth` and `Immunization` models (migrations `0009` and `0010`, including the one-off conversion) in `backend/services/education/students/`. API in `households.py`, routes in `backend/api/v1/student_urls.py`:
  - `/students/households/`
  - `/students/guardians/`
  - `/students/<id>/profile/`, `/guardians/`, `/health/`, `/immunizations/` and `/household/`
- Frontend: `services/household.service.ts`, a rewritten `StudentProfilePage.tsx` (tabs) and `FamiliesPage.tsx` (Households directory).
- Tests: `backend/tests/test_households.py` has 4 new tests. They cover sibling grouping, guardian/health/immunization management, admin-only changes and isolation between schools. They pass, along with the existing isolation, student, signup and permission tests (63 passed).
- Browser check: opened the households directory and a household, added a guardian with a pickup restriction, saved a severe allergy and an immunization, and opened every tab. No errors.






##############################################################################################################################################################
### Phase 2: Admissions ✅

**What a school can now do**
- Turn on **online applications** (Admissions → Online form settings) and share a public link such as `/apply/<school>`. Families apply from a phone or computer with no account.
- The form has five steps:
  1. Student.
  2. Parents and guardians: up to four, each with custody, pickup and billing choices.
  3. Previous school and health: allergies, medical and learning-support needs.
  4. **Document upload**: PDF, JPG or PNG, checked for type and size.
  5. **Review and e-signature**: typed full name, agreement to the declaration and privacy notice, optional photo consent. The time and IP address are recorded.
- The family gets an **application number and tracking code**, by email too, and can **check the status online** at `/apply/status`.
- The school sets:
  - the school year;
  - the welcome text;
  - the list of documents to upload;
  - the declaration families sign;
  - an email address that is told about each new application.
- **Review pipeline** with counts:
  - statuses: New → In review → Accepted / Waitlisted / Declined → Enrolled, plus Withdrawn;
  - search, and a filter by source (online or office).
- Each application has:
  - a decision panel with an optional note, which is emailed to the family for accept, waitlist or decline;
  - interview or assessment date, notes and rating;
  - documents, where staff can upload and remove files;
  - a full **history** of every change and note, and who made it.
- **Enrol in one click**: choose the class and section. This creates the student, their **household, guardians (with permissions) and health notes** from the application, then opens the new student's record.
- **Re-enrolment**: start a campaign ("Returning for 2027–28?") for all current students.
  - Parents see a card in the parent portal and answer Returning, Undecided or Not returning, signing with their name.
  - The office sees live counts, can filter, and can record an answer given by phone.
  - The office can close and reopen the campaign.
- Office staff can still enter walk-in or paper applications through the same form (Admissions → New application).
- **Admissions** is now in the admin menu, translated into all 23 languages.

**Safety**
- Only school admins can see or change applications. Before this, any signed-in user could.
- The public form works only when the school has turned it on. It is rate-limited per IP.
- Status can only be checked with both the application number and its secret tracking code.
- Enrolling requires an accepted application and can happen only once.
- Each school only sees its own applications and campaigns. Application numbers are unique across all schools.

**Built**
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

### Phase 3: Fees / Billing ✅

**What a school can now do**
- **Family accounts** (Fees → Family Accounts): one billing account per household, covering every child's invoices together.
  - Shows the amount outstanding and any credit held, with search and a filter for families who owe.
  - School-wide totals for outstanding and credit.
- **Family statement** for any date range:
  - lists every invoice, payment, refund and credit, with a running balance;
  - shows who is billed (guardians marked "Receives invoices");
  - can be printed, or **emailed to the billing parents** with one click.
- **Record a family payment** once:
  - it pays the oldest invoices first, across all the children;
  - anything extra is kept as **account credit**.
- **Account credit**:
  - give credit with a reason (for example a sibling discount or fee waiver);
  - **apply credit** to open invoices;
  - credit from overpayments and refunds is tracked automatically.
- **Refunds** on any payment, up to the amount not yet refunded:
  - back to the original method (card payments are refunded through Stripe automatically), in cash, by bank transfer, or kept as account credit;
  - the invoice reopens by the refunded amount.
- **Payment plans** (Fees → Payment Plans):
  - split an unpaid invoice into 2–24 installments, weekly, every two weeks, monthly or quarterly;
  - the original invoice is closed with a note, so the family is **never billed twice**;
  - save reusable plans such as "Termly: 3 payments".
- **Online payments** (Fees → Online Payments):
  - **Stripe** for cards, Apple Pay and Google Pay in the school's own currency (135+ currencies, including zero-decimal ones like KRW and JPY);
  - **JazzCash / Easypaisa** for Pakistan;
  - step-by-step setup with the webhook address to copy;
  - keys are never shown again after saving.
- **Parents pay online**:
  - the parent dashboard and the student Fees page show a **Family account** card with the amount due, credit and statement;
  - each open invoice has a **Pay online** button that goes to Stripe Checkout and back;
  - the payment is recorded on the invoice automatically when Stripe confirms it.
- **Fee reminders** now go to the guardians marked "Receives invoices", instead of only the student's email.
- The Pakistani flow is kept: monthly challans, paid slips, balance brought forward, JazzCash and Easypaisa all still work.

**Safety and correctness fixes found on the way**
- Payment gateway settings, including secret keys, could be read by **any signed-in user**, students too.
  - Now only finance staff can see or change them.
  - Secrets are write-only.
  - Leaving a secret empty when editing keeps the saved one.
- **"Pay online" never worked before**: the payment-detail route caught `/payments/session/` first. The route order is fixed.
- Any signed-in user could start a payment for **any invoice** in the school. Now only invoices the user may see can be paid.
- Payment webhooks ran with no school selected, so confirmations could not find the invoice. Stripe events are now matched to the right school and checked with that school's own webhook secret. Replayed events never pay twice.
- Online payments were always charged in PKR. They now use the school's currency.
- The old "create installments" left the original invoice open, so **families were billed twice**. It is replaced by the payment-plan action above.
- A payment provider could be set up only once across **all** schools. It is now once per school.

**Phase 1 improvement made here**
- Children linked to the same parent login are now kept in one household.
  - This covers families without a CNIC on file, for example the demo parent's Ali and Fatima Raza.
  - Migration `students/0011` merged the households that had been split.
  - New siblings join automatically.

**Built**
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

### Phase 4: Attendance ✅

**What a school can now do**
- **Attendance codes**, US style:
  - Present;
  - Absent, **excused or unexcused**;
  - **Tardy** with **minutes late**, excused or unexcused;
  - **Early dismissal**;
  - No school.
- Every code can carry a **reason**: illness, medical appointment, family, religious observance, school activity, transport, other.
- **Lesson (period) attendance** (Attendance → Lesson Attendance):
  - teachers pick a class, section and date; the day's lessons come from the timetable, or from the school's periods;
  - they mark Present, Tardy (with minutes), Absent or Excused per student, with a note;
  - a tick shows which lessons are already done;
  - teachers can only take attendance for their own classes, and never for future dates.
- **Two ways to run attendance** (Attendance → Absence Reports → settings):
  - **Once a day** (homeroom register, as before). Lesson marks are extra detail.
  - **Every lesson**. The daily code is worked out automatically:
    - absent from every lesson = Absent;
    - late to the first lesson = Tardy;
    - left partway through = Early dismissal.
- **Automatic family alerts**. Guardians marked "Receives school messages" and linked parent accounts are told by **email and in the parent portal**:
  - when a student is **absent without an excuse**;
  - when a student **arrives late without an excuse** (with the minutes);
  - with a **frequent-absence warning** after a set number of unexcused absences in 30 days (default 3; 0 turns it off).
  - Each alert is sent once. Excused absences never send an alert.
- **Parents report absences** in the parent portal ("Report an absence"): child, absent / arriving late / leaving early, dates, reason and note. They can see whether each report is waiting, approved or declined.
- **The office reviews reports** (Attendance → Absence Reports):
  - "Excuse" marks every school day in the range as excused, with the reason;
  - "Decline" sends a note to the parent;
  - office-entered reports are approved at once.
- **Attendance history** on the student page, which replaces the old 30-day list:
  - the Attendance tab shows a **month calendar** with colour codes (P, T, TE, A, AE, ED);
  - totals for the school year: attendance %, present, absent excused / unexcused, tardy, early dismissal;
  - the family's absence reports and every alert sent, with the addresses it went to;
  - the office can click any school day to change its code, excuse it, or add a reason and note.
- The Pakistani daily register (Attendance → Student Marking) works exactly as before. Absences marked there now also alert the family.

**Fixes found on the way**
- The attendance **analytics, patterns, alerts, trends and at-risk** endpoints were never reachable, because the `<id>/` route caught them first. The screens that call them now work.
- The old absence alert ran only when a record was first created, told only linked parent accounts, and sent a WhatsApp to the **student's own phone**. It is replaced by the guardian alerts above.
- Records that were already "Excused" are flagged as excused absences (migration `0009`).

**Built**
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

Next Phase — Remaining Upgradation Plan after completion of above 22 steps 


Yes.  treate above  **22 modules as Phase 1 / current priority**, and then removed those areas from the broader roadmap. The following are the **remaining upgrade areas** that should come after the first 22, while keeping the same format and style. These are based on the additional roadmap items in your uploaded plan, especially foundations, SaaS operations, mobile, internationalization, compliance, security, integrations, and launch requirements. 

## Next Phase — Remaining Upgradation Plan

|  **#** | **Phase**          | **Module**                                 | **Current Pakistani-Style System**                   | **Upgrade to International Standard**        | **Key Features to Implement**                                                                                                                            | **Priority**                 |
| -----: | ------------------ | ------------------------------------------ | ---------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **23** | **Platform**       | **Multi-School / Multi-Tenancy**           | Basic school separation                              | **Enterprise Multi-Tenant Architecture**     | School-level data isolation, school registry, school-specific configuration, school codes, tenant scoping, regional deployment, school-specific settings | 🔴 **23 — First Next Phase** |
| **24** | **Platform**       | **Subscription & SaaS Plans**              | No complete school subscription system               | **School SaaS Subscription Management**      | Starter/Standard/Premium/Enterprise plans, student limits, module limits, trials, renewals, upgrades/downgrades, subscription status                     | 🔴 **24**                    |
| **25** | **Platform**       | **Online Payment Gateway**                 | Local/manual payments                                | **International Payment Infrastructure**     | International cards, payment gateway integration, recurring payments, payment webhooks, payment verification, failed-payment handling                    | 🔴 **25**                    |
| **26** | **Platform**       | **School Billing / Subscription Invoices** | Student fee invoices only                            | **SaaS Billing & Invoicing**                 | Platform subscription invoices, downloadable invoices, payment history, billing statements, tax information, renewal dates                               | 🔴 **26**                    |
| **27** | **Operations**     | **Data Import / Migration**                | Manual data entry                                    | **Bulk Data Import System**                  | CSV/Excel import, students, parents, teachers, classes, fee balances, validation, duplicate detection, preview before import, error reports              | 🔴 **27**                    |
| **28** | **Operations**     | **Data Export**                            | Individual module exports                            | **Complete School Data Export**              | CSV, Excel, PDF, JSON, complete school backup/export, module-wise export, filtered exports                                                               | 🔴 **28**                    |
| **29** | **Operations**     | **Help Centre / Knowledge Base**           | No centralized help system                           | **Integrated Help Centre**                   | Searchable help articles, role-based guides, FAQs, tutorials, videos, module documentation                                                               | 🟠 **29**                    |
| **30** | **Operations**     | **Support & Ticketing**                    | Support handled manually                             | **Professional Support Management**          | Support tickets, priority levels, ticket status, SLA, staff assignment, canned responses, ticket history                                                 | 🟠 **30**                    |
| **31** | **Operations**     | **In-App Help & Onboarding**               | Users learn system manually                          | **Guided Product Onboarding**                | Setup checklist, guided tours, contextual help, first-login wizard, onboarding progress, role-based guidance                                             | 🟠 **31**                    |
| **32** | **Operations**     | **Email Infrastructure**                   | Basic email/notifications                            | **Professional Transactional Email System**  | Password reset emails, invoice emails, notices, verification emails, SPF, DKIM, DMARC, email templates, delivery tracking                                | 🟠 **32**                    |
| **33** | **Operations**     | **SMS / WhatsApp Integration**             | WhatsApp/manual communication                        | **Automated Messaging Infrastructure**       | Attendance alerts, fee reminders, admission updates, emergency alerts, SMS templates, WhatsApp Business integration, delivery status                     | 🟠 **33**                    |
| **34** | **Operations**     | **Error Tracking**                         | Errors handled through development logs              | **Centralized Application Error Monitoring** | Frontend errors, backend errors, error grouping, stack traces, school/user context, alerts, production error history                                     | 🟠 **34**                    |
| **35** | **Operations**     | **System Monitoring & Logging**            | Basic application monitoring                         | **Production Monitoring Platform**           | Uptime monitoring, API response time, database health, queue monitoring, server health, centralized logs, alerts                                         | 🟠 **35**                    |
| **36** | **Operations**     | **Status Page**                            | No public service status                             | **Public System Status Platform**            | Service availability, incidents, maintenance notices, uptime history, incident updates                                                                   | 🟠 **36**                    |
| **37** | **Operations**     | **Product Analytics**                      | Basic/general reports                                | **Product Usage Analytics**                  | Module usage, active schools, active users, feature adoption, usage trends, retention analytics without unnecessary student tracking                     | 🟠 **37**                    |
| **38** | **Operations**     | **Customer / School CRM**                  | No structured customer management                    | **School Customer Relationship Management**  | Leads, demos, prospects, trials, onboarding status, renewals, customer notes, sales pipeline                                                             | 🟡 **38**                    |
| **39** | **Operations**     | **Release Notes / Updates**                | Updates communicated manually                        | **Product Update Centre**                    | What's New, version history, feature announcements, update notifications, release notes by module                                                        | 🟡 **39**                    |
| **40** | **API**            | **Public API**                             | Internal APIs mainly                                 | **Developer API Platform**                   | API keys per school, authentication, documented endpoints, rate limits, API versioning, developer documentation                                          | 🟡 **40**                    |
| **41** | **API**            | **Webhooks**                               | Limited/no external event system                     | **Event-Based Webhook System**               | Student events, attendance events, payment events, admission events, webhook subscriptions, retry mechanism, delivery logs                               | 🟡 **41**                    |
| **42** | **Mobile**         | **Progressive Web App**                    | Desktop/browser-focused system                       | **Installable PWA**                          | App manifest, icons, splash screen, service worker, offline app shell, add-to-home-screen, push notifications                                            | 🟡 **42**                    |
| **43** | **Mobile**         | **Native Mobile Applications**             | No complete native apps                              | **iOS & Android School Apps**                | Parent app, student app, teacher app, push notifications, attendance, fees, grades, homework, messages, calendar                                         | 🟡 **43**                    |
| **44** | **Mobile**         | **Offline Attendance**                     | Attendance requires active connection                | **Offline-First Teacher Attendance**         | Mark attendance without internet, local storage, synchronization, conflict handling, sync status                                                         | 🟡 **44**                    |
| **45** | **Mobile**         | **Mobile Authentication**                  | Standard login                                       | **Modern Mobile Authentication**             | School login, Google login, Apple Sign-In, biometric session unlock, secure token storage, account recovery                                              | 🟡 **45**                    |
| **46** | **Mobile**         | **Mobile Account Management**              | Account management mainly web-based                  | **Mobile Self-Service Account Controls**     | Account deletion request, session management, notification preferences, privacy settings                                                                 | 🟡 **46**                    |
| **47** | **International**  | **Multi-Language System**                  | Mainly English/Pakistani terminology                 | **International Language Support**           | English UK/US, Urdu, Arabic RTL, French, German, Spanish, translation files, translation management                                                      | 🟢 **47**                    |
| **48** | **International**  | **Currency & Regional Settings**           | Pakistani Rupees/defaults                            | **Multi-Currency Regional System**           | PKR, USD, GBP, EUR and other currencies, ISO currency codes, smallest currency units, regional payment methods                                           | 🟢 **48**                    |
| **49** | **International**  | **Time Zone & Date Localization**          | Pakistan-specific date/time                          | **Global Date & Time System**                | School time zone, local date format, number format, first day of week, daylight-saving handling                                                          | 🟢 **49**                    |
| **50** | **International**  | **International Academic Systems**         | Pakistani academic structure                         | **Configurable Global Academic Structures**  | Academic years, terms, semesters, grading scales, UK Year system, US grades, European grading systems, Pakistani boards                                  | 🟢 **50**                    |
| **51** | **International**  | **Regional Terminology**                   | Challan, Date Sheet, Award List etc.                 | **Country-Based Terminology System**         | Grade/Class/Year, Homeroom/Form/Section, Principal/Head Teacher, configurable terminology by country                                                     | 🟢 **51**                    |
| **52** | **Infrastructure** | **Regional Cloud Deployment**              | Single-region deployment                             | **Multi-Region Cloud Architecture**          | Pakistan region, EU region, US region, region-specific databases/files/backups, school-region assignment                                                 | 🟢 **52**                    |
| **53** | **Infrastructure** | **Disaster Recovery**                      | Basic backups                                        | **Enterprise Disaster Recovery**             | Encrypted backups, second-region backup, point-in-time recovery, RPO/RTO, quarterly restore testing, disaster recovery documentation                     | 🟢 **53**                    |
| **54** | **Infrastructure** | **Infrastructure as Code**                 | Manual infrastructure configuration                  | **Automated Cloud Infrastructure**           | Terraform, repeatable environments, staging/production infrastructure, regional deployment automation                                                    | 🟢 **54**                    |
| **55** | **Infrastructure** | **Scalable Application Architecture**      | Basic application deployment                         | **Highly Available Architecture**            | Managed PostgreSQL, Redis, object storage, CDN, multiple application instances, load balancing, auto-scaling                                             | 🟢 **55**                    |
| **56** | **Security**       | **Advanced Authentication Security**       | Basic username/password                              | **Enterprise Authentication**                | MFA, TOTP, strong password policy, account lockout, session management, refresh-token rotation, sign-out-all-devices                                     | 🟢 **56**                    |
| **57** | **Security**       | **Application Security**                   | Basic security controls                              | **Web Application Security Hardening**       | CSP, HSTS, secure CORS, frame protection, rate limiting, secure cookies, security headers                                                                | 🟢 **57**                    |
| **58** | **Security**       | **Security Testing**                       | Development-level testing                            | **Continuous Security Testing**              | Dependency scanning, container scanning, code scanning, vulnerability monitoring, penetration testing                                                    | 🟢 **58**                    |
| **59** | **Security**       | **Secrets & Credential Management**        | Credentials/configuration may be application-managed | **Enterprise Secrets Management**            | Secret manager, encrypted credentials, key rotation, secure API keys, removal of shared/default passwords                                                | 🟢 **59**                    |
| **60** | **Security**       | **Audit & Compliance Infrastructure**      | Basic audit information                              | **Enterprise Audit Trail**                   | User actions, data access, administrative changes, support access, timestamps, IP/device information, immutable audit records                            | 🟢 **60**                    |
| **61** | **Privacy**        | **Data Retention Management**              | Records retained without configurable policies       | **Configurable Data Retention**              | Retention rules by record type, automatic archival, anonymization, deletion jobs, school-specific retention policies                                     | 🟢 **61**                    |
| **62** | **Privacy**        | **Privacy Rights Management**              | No complete privacy workflow                         | **Data Subject Rights Centre**               | Data export, correction, deletion/anonymization, restriction, request tracking, deadlines, privacy request history                                       | 🟢 **62**                    |
| **63** | **Privacy**        | **Consent Management**                     | Limited consent controls                             | **Centralized Consent Management**           | Parent/student consent, optional services consent, analytics consent, photo/media consent, consent history and withdrawal                                | 🟢 **63**                    |
| **64** | **Privacy**        | **Data Processing & Privacy Controls**     | Pakistan-focused privacy workflow                    | **International Privacy Compliance Layer**   | Privacy notices, DPA support, sub-processors, processing records, privacy-by-default settings, data minimization                                         | 🟢 **64**                    |
| **65** | **Compliance**     | **EU / UK Compliance**                     | Not designed specifically for EU/UK requirements     | **GDPR / UK GDPR Readiness**                 | EU data region, DPA, DPIA support, data-subject rights, retention, breach procedures, UK Children's Code considerations                                  | 🟢 **65**                    |
| **66** | **Compliance**     | **EU AI Governance**                       | AI features not region-controlled                    | **AI Governance & Human Oversight**          | AI feature controls per school, explainable AI decisions, teacher confirmation, AI logs, model documentation, AI disclosure                              | 🟢 **66**                    |
| **67** | **Compliance**     | **US Student Privacy Compliance**          | Pakistan-focused privacy model                       | **FERPA / COPPA / State Privacy Readiness**  | Student-record controls, directory-information settings, disclosure logs, retention, no targeted advertising, school-purpose data use                    | 🟢 **67**                    |
| **68** | **Compliance**     | **US School Data Agreements**              | No US-specific contracts                             | **US School Contract Framework**             | NDPA, state addenda, data privacy agreements, SLA, security documentation, school data processing terms                                                  | 🟢 **68**                    |
| **69** | **Compliance**     | **Accessibility**                          | Accessibility not formally standardized              | **WCAG 2.1 AA Accessibility**                | Keyboard navigation, screen readers, contrast, focus states, captions, accessible forms, accessibility testing                                           | 🟢 **69**                    |
| **70** | **Compliance**     | **Accessibility Certification**            | No formal accessibility documentation                | **Accessibility Conformance Reporting**      | VPAT/Accessibility Conformance Report, accessibility audit, documented compliance status                                                                 | 🟢 **70**                    |
| **71** | **Compliance**     | **Security Certification**                 | No international certification                       | **ISO 27001 / SOC 2 Readiness**              | Security policies, access control, vendor management, incident response, evidence collection, audits and certification process                           | 🟢 **71**                    |
| **72** | **Integrations**   | **Google Workspace Integration**           | Limited external integration                         | **Google Education Integration**             | Google login, Workspace integration, user synchronization, calendar/classroom integration where required                                                 | 🟢 **72**                    |
| **73** | **Integrations**   | **Microsoft 365 / Entra Integration**      | Limited/no Microsoft integration                     | **Microsoft Education Integration**          | Microsoft login, Entra ID SSO, account synchronization, organization-based authentication                                                                | 🟢 **73**                    |
| **74** | **Integrations**   | **US SSO Integrations**                    | Not designed for US school districts                 | **Clever / ClassLink SSO**                   | SAML/OIDC, district authentication, role mapping, secure school login                                                                                    | 🟢 **74**                    |
| **75** | **Integrations**   | **Education Rostering**                    | Manual student/class enrollment                      | **Automated Education Rostering**            | OneRoster 1.2, students, teachers, classes, enrollments, synchronization, conflict handling                                                              | 🟢 **75**                    |
| **76** | **Integrations**   | **LMS Integration**                        | No standardized LMS integration                      | **LTI 1.3 Integration**                      | LMS launch, secure authentication, course linking, assignment/learning-system integration                                                                | 🟢 **76**                    |
| **77** | **Integrations**   | **District Data Integration**              | School-level data entry                              | **District-Level Education Integration**     | Ed-Fi support, district synchronization, centralized data exchange, standardized education data                                                          | 🟢 **77**                    |
| **78** | **AI Governance**  | **AI Feature Controls**                    | AI features treated as general application features  | **Configurable AI Governance**               | AI enable/disable per school, AI usage limits, AI audit logs, human approval, AI transparency                                                            | 🟢 **78**                    |
| **79** | **AI Governance**  | **AI Privacy & Data Controls**             | AI data controls limited                             | **Privacy-Preserving AI**                    | Data masking, restricted AI data sharing, zero-retention providers where available, regional AI processing                                               | 🟢 **79**                    |
| **80** | **Business**       | **International Sales Infrastructure**     | Pakistan-focused sales                               | **Global School Sales System**               | Market-specific websites, international pricing, demo school, sales materials, trust centre, case studies                                                | 🟢 **80**                    |
| **81** | **Business**       | **Customer Success**                       | Support after problems occur                         | **Structured Customer Success**              | Onboarding calls, 30/60/90-day check-ins, product usage alerts, renewal management, customer health                                                      | 🟢 **81**                    |
| **82** | **Business**       | **Trust & Security Centre**                | Security information scattered                       | **Public Trust Centre**                      | Security overview, privacy documents, sub-processors, DPA, SOC 2/ISO status, VPAT, status page                                                           | 🟢 **82**                    |
| **83** | **Business**       | **Incident Management**                    | Manual incident handling                             | **Enterprise Incident Response**             | On-call rotation, incident runbooks, escalation, affected-school notifications, post-incident reviews                                                    | 🟢 **83**                    |
| **84** | **Business**       | **Continuous Compliance Management**       | Compliance handled when needed                       | **Continuous Compliance Program**            | Annual penetration testing, quarterly access reviews, restore tests, yearly DPIA review, vendor reviews, security training                               | 🟢 **84**                    |

### Final sequence

So your overall roadmap becomes:

**1–22:** Core school-system modernization
**23–46:** SaaS platform, operations, APIs and mobile
**47–55:** Internationalization and infrastructure
**56–64:** Security and privacy
**65–71:** International compliance and accessibility
**72–77:** International education integrations
**78–79:** AI governance
**80–84:** International business, customer success and continuous operations

This keeps your original **22 modules untouched** and puts the additional work into the **next upgrade phase**, rather than repeating Student Records, Admissions, Billing, Attendance, Academics, Gradebook, Communication, Calendar, etc. The source roadmap specifically identifies foundations, SaaS billing, support/operations, mobile, internationalization, EU/UK compliance, US compliance, integrations, and launch/scale as additional work beyond the core product modules.   





Missing items from the current 1–84 overall plan
Missing #	Area	What is missing / should be added	Why it matters	Suggested position
M1	Core Product	Production Readiness / Core Functional Completion	LocalStorage migration, fixing broken buttons, removing placeholder actions, fixing known bugs and tests are not clearly represented as their own upgrade item.	Before 23
M2	Infrastructure	Staging Environment	Separate staging environment with anonymized data is explicitly required in the full plan but not clearly represented in 23–84.	After 52
M3	Infrastructure	Automated Backup & Restore Testing	Backups are mentioned inside Disaster Recovery, but the Lean plan specifically requires a restore test before the first paying school.	With 53
M4	Security	Rate Limiting	Login, signup, password reset and AI endpoint rate limits are explicitly required but are not clearly named in the 23–84 list.	With 57
M5	Security	Dependency / Container / Code Scanning	pip-audit, npm audit, Trivy and CodeQL are specifically mentioned in the full plan.	With 58
M6	Security	External Penetration Testing	The Lean roadmap specifically includes an affordable external security test before international expansion.	With 58
M7	Security	Security Policies & Staff Security Training	Required later for SOC 2/ISO and continuous compliance, but currently only partially covered.	With 71/84
M8	Privacy	Sub-Processor Management	International privacy readiness requires maintaining a list of hosting, email, AI, support and analytics providers and managing changes.	With 64/65
M9	Privacy	Breach Response & Notification	A dedicated breach-response workflow/playbook is not clearly represented in the 23–84 list.	With 64/65
M10	Privacy	Contract-End Data Deletion	Exporting/deleting data at the end of a school's contract is specifically required.	With 61/62
M11	International	Legal Documents by Country	Country/language-specific privacy notices, terms and legal texts are explicitly part of internationalization.	With 47–51 / 65
M12	Mobile	App Store Compliance & Release Pipeline	Apple privacy details, Google Data Safety, age rating, privacy manifest and staged releases are separate operational requirements.	With 43–46
M13	Payments	Failed Payment / Dunning Workflow	Payment retries/reminders and read-only/suspension rules are not fully represented by Online Payment Gateway + Subscription Billing.	With 24–26
M14	Payments	Tax Handling	VAT, sales tax, tax IDs and regional tax handling are mentioned in the full roadmap but not explicitly in the 23–84 list.	With 25/26 or 48
M15	Operations	School Onboarding / Migration Workflow	Import exists, but the complete onboarding process—setup checklist, configuration and guided setup—is broader.	With 27/31
M16	Operations	Customer Feedback / Product Feedback Loop	The launch plan explicitly includes collecting pilot feedback and using it for product improvement.	With 80/81
M17	Business	Pilot School Program	3–5 pilot schools per new market are explicitly part of the launch strategy.	With 80
M18	Business	Market-Specific Sales & Pricing	International websites, pricing pages, demos and case studies are mentioned, but this deserves a clearer sales-readiness item.	With 80
M19	Operations	Release / Deployment Process	The Lean plan requires a regular tested production deployment and release-note workflow.	With 39 + 55
M20	Business	Ongoing Vendor / Third-Party Review	Sub-processors, support tools, AI providers, hosting and analytics need recurring review.