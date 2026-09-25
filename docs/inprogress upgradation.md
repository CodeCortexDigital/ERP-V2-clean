# Upgrade to international standard: progress

We are working through phases 1 to 19 in order. Phases 20 to 22 come later.
Each phase is marked done only after it passes its backend tests and a browser check. The notes for each finished phase are under **Progress log** below the table.

|  Phase | Module                          | Current Pakistani-Style System                                                                 | Upgrade to International Standard      | Key Features to Implement                                                                                                                                                                            | Priority         | Status |
| ----: | --- | --- | --- | --- | --- | --- |
|  **1** | **Student & Household Records** | One flat student form with `father_*`, `mother_*`, caste, orphan status, B-Form, family income | **Household-based student management** | Student profile, household/family, multiple guardians, custody details, pickup permissions, billing parent, communication parent, health information, allergies, immunizations, student profile tabs | 🔴 **1 — First** | ✅ Done |
|  **2** | **Admissions**                  | Office staff manually enters student application                                               | **Online admissions workflow**         | Public application form → application review → approve/reject → enrollment → document upload → e-signatures → yearly re-enrollment                                                                   | 🔴 **2**         | ✅ Done |
|  **3** | **Fees / Billing**              | Monthly challans, paid slips, manual fee records, delete fees                                  | **Complete tuition billing system**    | Invoices, fee structures, payment plans, family statements, online payments, reminders, credits, refunds, payment history, challan support for Pakistan                                              | 🔴 **3**         | ✅ Done |
|  **4** | **Attendance**                  | Simple Present/Absent per day                                                                  | **Advanced attendance management**     | Present, absent, tardy, excused, unexcused, period-wise attendance, attendance history, automatic parent alerts                                                                                      | 🔴 **4**         | ✅ Done |
|  **5** | **Academics / Classes**         | Basic classes and subjects                                                                     | **Academic structure**                 | Academic years, terms/semesters, grades, sections, subjects, teachers, courses, class schedules, student enrollment                                                                                  | 🔴 **5**         | ✅ Done |
|  **6** | **Gradebook**                   | Exam marks → award list → marksheet                                                            | **Modern digital gradebook**           | Assessment categories, weighted grades, assignment/exam marks, GPA, grading scales, report cards, transcripts, standards-based grading                                                               | 🔴 **6**         | ✅ Done |
|  **7** | **Communication**               | Notices and WhatsApp                                                                           | **Two-way school communication**       | Parent-teacher messaging, announcements, email, SMS, notifications, communication history, targeted messages                                                                                         | 🟠 **7**         | ✅ Done |
|  **8** | **Calendar & Events**           | Basic notices/date sheet                                                                       | **School-wide calendar**               | Academic calendar, holidays, exams, events, meetings, deadlines, parent/student calendar, reminders                                                                                                  | 🟠 **8**         | ✅ Done |
|  **9** | **Behaviour / Discipline**      | Affective and psychomotor ratings                                                              | **Behaviour management**               | Discipline incidents, incident categories, actions, warnings, follow-ups, positive points/rewards, behaviour history                                                                                 | 🟠 **9**         | ✅ Done |
| **10** | **Student Portal**              | Basic student information/results                                                              | **Complete student/family portal**     | Profile, attendance, grades, assignments, fees, invoices, messages, calendar, documents, academic progress                                                                                           | 🟠 **10**        | ✅ Done |
| **11** | **Parent Portal**               | Limited parent information                                                                     | **Family/Parent Portal**               | Multiple children under one account, fees, attendance, grades, communication, calendar, applications, documents                                                                                      | 🟠 **11**        | ✅ Done |
| **12** | **Teacher Portal**              | Basic teacher functionality                                                                    | **Teacher Workspace**                  | Classes, attendance, gradebook, assignments, student profiles, messaging, calendar, reports                                                                                                          | 🟠 **12**        | ✅ Done |
| **13** | **Library**                     | Basic or missing                                                                               | **Library Management**                 | Books, copies, QR/barcodes, issue/return, reservations, overdue tracking, member records                                                                                                             | 🟡 **13**        | ✅ Done |
| **14** | **Transport**                   | Basic transport information                                                                    | **Transport Management**               | Routes, stops, buses, drivers, students, pickup/drop-off, assignments, transport notifications                                                                                                       | 🟡 **14**        | ⏳ Next |
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


### Phase 5: Academics / Classes ✅

**What a school can now do**
- **School years & terms** (Academic Setup → School Years & Terms):
  - add school years with first and last days, and choose the current year;
  - split a year into **2 semesters, 3 trimesters, 3 terms or 4 quarters** in one click, or add terms by hand;
  - dates are checked: a term must sit inside its year, and terms cannot overlap;
  - the current term is highlighted. The gradebook and report cards in Phase 6 use these grading periods.
- **Grade levels and homeroom teachers** for every class: Pre-K, Kindergarten, Grade 1–12.
  - Grade levels put classes in order and decide promotions.
  - Existing classes were filled in automatically from their names ("Grade 5", "Class 3", "Year 10", "KG", "Nursery").
- **Start a new school year** ("Start this year" on next year's card):
  - a preview shows every student's move, one grade up and keeping their section name where it exists;
  - it shows who **graduates** (the top grade) and who needs attention (no grade level or no next grade);
  - tick students who **repeat the year**;
  - then, in one step: the new year becomes current, students move up, graduates are marked, and enrollment history is written.
- **Course catalog** (Academic Setup → Course Catalog), for every subject:
  - **department**;
  - **level**: Standard, Honors, Advanced, AP, IB, Support;
  - **credits**, for example 1.0 or 0.5;
  - **elective** and **offered this year**.
  - Changes save as you go. Transcripts and GPA (Phase 6) use these.
- **Enrollment history** on the student's Overview tab:
  - every class and section the student has been in, per school year, with dates and how each ended: Enrolled, Promoted, Repeated, Moved, Left, Graduated;
  - it is recorded automatically whenever a student is admitted, moved to another class or section (including the existing Promote Students page), leaves, or rolls over;
  - existing students were given their current enrollment once.
- **Class schedule** on the student's Overview tab: the week's lessons from the timetable (time, subject, teacher, room), opening on today.
- The Pakistani flow is kept: classes are reused every year as before, and the Promote Students page still works (it now also writes history).

**Built**
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





### Phase 6: Gradebook ✅

**What a school can now do**
- **Gradebook** (new menu item, also a teacher quick action). Choose class and subject, section and term, and get a spreadsheet of students × assignments:
  - type a score and press Tab;
  - shortcuts: **M** = missing (counts as 0), **EX** = excused (not counted), **INC** = incomplete, a number then **L** = late;
  - missing, excused and late cells are coloured;
  - each student's **running grade** (letter, percent, and how many are missing) updates as you type;
  - export to CSV.
- **Weighted categories** per class-subject:
  - one click adds a common set (Homework 20, Quizzes 20, Tests 40, Projects 10, Participation 10), or build your own;
  - the total is shown, and **drop the N lowest** scores per category.
  - If a category has no graded work yet, the weights re-scale over the categories in use.
- **Assignments**:
  - title, category, points, due date, term, for every section or one section, instructions;
  - "counts toward grade" (off for practice work), and "students and parents can see it".
- **Exams feed the gradebook**. "Add an exam" brings an exam from the Examination module in, with its marks, placed in the term that contains the exam date. Marks entered or changed later in Examination stay in sync. The Pakistani exam → award list → marksheet flow keeps working.
- **Grading scales** (Gradebook → Grading Scales):
  - US A–F with plus/minus and GPA points (A 93+ = 4.0 … F), standards levels 4–1, or the school's existing grade scale, which is picked up automatically as the default;
  - edit grades, minimum percents and GPA points; choose the default; set the passing mark.
- **Standards-based grading** (Gradebook → Standards):
  - list the standards for each subject (code + "what the student can do");
  - rate every student per term: 4 Exceeds, 3 Meets, 2 Approaching, 1 Beginning.
- **Report cards** (Gradebook → Report Cards), for each term:
  - subject grades with category breakdown, standards ratings, **teacher comments** per subject, a **homeroom comment**, attendance for the term, and **unweighted and weighted GPA** (Honors +0.5, AP/IB +1.0, weighted by course credits);
  - preview any student, write comments in place, print;
  - **release to families** per class or for all classes; parents get an in-app notice;
  - "Hide again" undoes a release.
- **Transcripts**: every school year from enrollment history, with each course's term grades, final grade, and credits attempted and earned (credits only for a pass), the year's GPA, **cumulative GPA** and total credits. Printable.
- **Families and students**: a **Grades** card on the parent dashboard and the student Results page shows each subject's current grade, and opens to the published assignments and scores (missing work flagged). Report cards and transcripts are there once released.
- The student page's Grades tab now shows the report card, with staff comments, a term selector and the transcript, above the exam results.

**Safety**
- Teachers can only open and grade the classes they teach; admins can open all.
- Only admins change grading scales and release report cards.
- Families only see report cards that have been released, and only published assignments.
- Each school's gradebook is separate. The isolation sweep covers the new list endpoints: 8 passed.

**Built**
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

### Phase 7: Communication ✅

**What a school can now do**
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
- **Announcements** (sidebar → Announcements). Staff post to:
  - everyone, all parents, all staff, all students, **chosen classes** or **grade levels** (for classes and grades, choose parents and/or students).
  - Delivery: the **portal**, plus **email** (including guardians without a login who are marked "Receives school messages") and **SMS**.
  - The office can **pin** an announcement and **schedule** it for later. The command `send_scheduled_announcements` sends due ones, and they are also sent the next time anyone opens the list.
  - Staff see delivered, read, email and text counts.
  - Teachers can only announce to their own classes; families only see announcements sent to them.
- **SMS that really sends** (Communication → SMS):
  - the school's Twilio account (SID, auth token, sending number, country code for local numbers such as 0300… → +92300…);
  - the auth token is never shown again;
  - send to a list of numbers, with a result per number;
  - every text is logged.
  - The old "SMS Gateway" tab only **pretended** to send ("SMS queued") and is replaced.
- **Communication history** (new tab on the student page): conversations about the student, announcements that reached their family, attendance alerts, and WhatsApp/SMS messages, newest first.
- The existing WhatsApp tools stay as they are. The teacher shortcut to them is renamed "WhatsApp & SMS" so it isn't confused with Messages.

**Fixes found on the way**
- There were **no email settings**, so every email tried a mail server on the same computer with no timeout.
  - Email is now configured from `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL` and `EMAIL_TIMEOUT` (15 s).
  - Without a mail server it prints to the console.
  - This also makes fee reminders, attendance alerts, admissions and report-card emails dependable.
- Sending an announcement to the whole school took over a minute and was cut off. Emails and texts now go out **in the background** over one mail connection, so posting is instant (246 recipients in the demo).

**Built**
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


### Phase 8: Calendar & Events ✅

**What a school can now do**
- **One school calendar** for every role (sidebar → Calendar), with a month grid and a list view. It brings together:
  - school events, holidays, trips, sports, meetings and deadlines added by staff;
  - **term start and end dates** from School Years;
  - **exams** from Examination (the office sees one entry per exam type per day, e.g. "Unit Test exams (36 papers)"; teachers and families see each paper for their classes);
  - **homework and assignment due dates** from the Gradebook (families only see published ones);
  - **fee due dates** for a family's own children;
  - their own **parent-teacher meetings**.
- **Who sees an event**: everyone, families, staff only, chosen classes, or grade levels.
  - Families only see what is for them and their children's classes.
  - Teachers can add events for their own classes; the office can add anything.
  - Only the person who added an event, or the office, can change or delete it.
- **Holidays close the school**: an event marked "School is closed" (every holiday is) counts as no school, so attendance treats those days like weekends.
- **Reminders**: an event can remind its audience on the day, 1, 2 or 3 days, or a week before, by portal notice and email. Run the command `send_calendar_reminders` once a day.
- **Parent-teacher meetings** (sidebar → Meetings):
  - a teacher offers times for a day (e.g. 15:00–17:00 in 15-minute meetings, with a room or video link), and the same time is never offered twice;
  - families see open times from **their own children's teachers only**, choose the child it's about, add a note, and book;
  - two families can't book the same time;
  - the teacher gets an email when a time is booked; either side can cancel and the other is told;
  - both get a reminder the day before.
- **Add to my phone calendar**: every user gets a private link that Google Calendar, Apple Calendar or Outlook can subscribe to. It shows the same items they see in the app and keeps itself up to date.

**Built**
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


### Phase 9: Behaviour / Discipline ✅

**What a school can now do**
- **Behaviour log** (Behaviour & Skills → Behaviour Log, now the first tab):
  - a teacher picks a class, taps one student, several, or "Whole class", chooses a **merit** (adds points) or an **incident** (takes points away), adds a note, and saves once for everyone chosen;
  - each student card shows their running points and incidents;
  - incidents can also have a time, a place, and a "follow up by" date;
  - a record can be kept **staff only** instead of shown to families.
- **Categories and points** (tab "Categories & Awards"): every school starts with 5 merits (Helping others, Excellent work, Participation, Kindness, Leadership) and 10 incident types (Homework not done, Late to class, Disrupting the class, Disrespect, Uniform, Mobile phone misuse, Bullying, Fighting, Cheating, Damage to property). The office can:
  - change points, severity and "tell the family" per category;
  - add categories;
  - retire them (a used category is retired, never deleted).
- **Actions and follow-ups** on each record:
  - verbal or written warning, detention, parent meeting, counselling, loss of privilege, community service, reward, and follow-up notes (staff only);
  - in-school suspension and suspension, which **only the office** can record;
  - start and end dates, a done tick, and an optional message to the family;
  - status moves Open → In review → Resolved.
- **Family alerts**: serious categories (e.g. Disrespect, Bullying, Fighting) tell the family by portal notice and email, including guardians marked "Receives school messages".
- **Positive points and awards**: the school sets milestones (by default Bronze 25, Silver 50, Gold 100 positive points). A student earns each award once, the teacher sees it straight away, and the family is told.
- **Behaviour history**:
  - a new **Behaviour** tab on the student page shows points, merits, incidents (and how many are open), awards, the next award, and the full history with actions; staff can open any record from there;
  - parents and students see the same record in the portal (Behaviour & Skills), with a switch between children. Staff-only records and internal follow-up notes are hidden from them.
- **Behaviour report**: for any date range and class:
  - merits, incidents, open incidents, net points and students involved;
  - counts by category, by class, and incidents by day of the week;
  - top positive points and most incidents;
  - follow-ups due and who is suspended today.
- Teachers see only their own classes (and records they logged); families only their own children.

**Fixes found on the way**
- **The existing behaviour data was not kept separate between schools.** Behaviour ratings, skills and observations from one school could be seen and changed by another school, and any signed-in user (including parents) could write to them.
  - Skills and observations now belong to a school (existing rows were moved to the right school, and each school got its own copy of the shared skill list).
  - Ratings go through their student.
  - Families can now only read their own children's ratings and observations, and only staff can change them.
  - The school-separation test now includes behaviour data.
- The sidebar highlighted two items when both linked to the same page with different tabs. Now only the matching one is highlighted.

**Built**
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


### Phase 10: Student Portal ✅

**What a school can now do**
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
- **Assignments** (sidebar → Assignments; the old Homework link opens the same page):
  - gradebook assignments and class homework together;
  - status for each piece: Upcoming, Due today, Overdue, Missing, Submitted, Marked or Excused;
  - the mark, the teacher's comment, and homework attachments to download;
  - filters: All, To do, Overdue / missing, Marked, and by subject.
- **Academic progress** (sidebar → Progress):
  - each term's average, attendance, absences, late arrivals, merits and incidents;
  - grades for every subject, term by term;
  - attendance by month for the last six months;
  - a line saying whether the average went up or down on the term before;
  - report cards open from here once the school releases them.
- **Documents** (sidebar → Documents, and a new **Documents** tab on the student page for staff):
  - the office and the student's teachers upload files (reports, certificates, medical notes, letters, consent forms and more) and choose whether the family can see each one;
  - families are told by portal notice when a file is shared with them;
  - families can **send a document to the school** (e.g. a doctor's note): the office and the class teachers are told, and it is marked "From family";
  - only the office or the person who uploaded a file can remove it; families can't change the school's files;
  - released report cards and issued certificates are listed in the same place;
  - allowed files: PDF up to 5 MB; images, Word and Excel up to 10 MB.
- Families and students only ever see their own children or themselves. Teachers see students in their own classes.

**Built**
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



### Phase 11: Parent Portal ✅

**What a school can now do**
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

**Fixes found on the way**
- In the Student and Parent portals, "Dashboard" stayed highlighted in the sidebar on every page. Now only the page you are on is highlighted.

**Built**
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



### Phase 12: Teacher Workspace ✅

**What a school can now do**
- **My day** at the top of the Teacher Portal dashboard. It shows everything that needs the teacher today:
  - **today's lessons** from the timetable, in order, with room and class. The lesson happening now is highlighted, and each lesson shows whether its register is done (a past lesson without one shows in red);
  - **daily registers** for the teacher's classes: marked out of total, absent and late. Registers still to take come first, the homeroom first among them. "Take register" opens that class's register;
  - **work to mark**: gradebook work that is due or past due and not fully marked (e.g. "Quiz 3 · 1/3"), and homework handed in but not marked yet;
  - **absence notes from parents** for today, for the teacher's classes only;
  - **meetings today** booked by parents, with who, about which child, and their note;
  - **behaviour follow-ups** that are due or overdue;
  - **due this week** (unpublished work is marked "not published"), unread messages, and the next 7 days of the calendar.
- **My Classes** (sidebar → My Classes): a card for each class the teacher teaches, with subjects, number of students, today's register, attendance, class average, missing work, open incidents, and how many students need attention. The homeroom class is marked.
- **Class roster** (open a class):
  - one row per student: attendance, days absent and late, the grade in each of the teacher's subjects, missing work, merits and incidents;
  - a **"needs attention"** flag with the reasons: attendance below 90%, average below 50%, 3 or more missing pieces of work, or 2 or more incidents this term;
  - sort by name, attention, attendance or average; show only students who need attention;
  - each name opens the student's record; buttons open the register, the gradebook and the behaviour log.
- **Class Reports** (sidebar → Class Reports):
  - everyone who needs attention across all the teacher's classes, and why;
  - grades by class and subject: average, highest, lowest and how many of each letter grade;
  - attendance by class: rate, days absent, late arrivals;
  - a print button.
- Teachers see only their own classes. The office sees every class on the same pages. Parents and students are kept out.

**Built**
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



### Phase 13: Library ✅

**What a school can now do**
- **A library module** (sidebar → Library) with five tabs: Desk, Catalogue, Members, Loans & Reservations, and Report & Rules.
- **Catalogue**:
  - add books with title, authors, ISBN, subject, shelf mark, publisher, year, edition, language and reading level, and say how many copies there are;
  - every copy gets its own barcode (`LIB-000001`, `LIB-000002`, …);
  - search by title, author, ISBN, shelf mark or barcode, and filter by subject;
  - a book's page shows each copy (on the shelf, on loan to whom and until when, held, lost, damaged or withdrawn), the reservation queue and how often it has been borrowed;
  - add copies, mark copies damaged, lost or withdrawn, or put them back on the shelf;
  - a book that was ever borrowed stays in the records (withdraw its copies instead of deleting it).
- **Barcodes and QR codes**: **Print labels** gives a sheet with the title, shelf mark, a barcode and a QR code for each copy. Members get printable **library cards** (`C-000001`) the same way.
- **The desk**:
  - scan a library card (or type a name or student number) to open the borrower, with books out, overdue books, fines and whether they are blocked;
  - scan books to lend them: the due date is set automatically, and a scanner that types the barcode and presses Enter works straight away;
  - scan returned books: late days and any fine are worked out;
  - if someone reserved the book, the desk shows **"Put aside for …"** and that family is told it is ready to collect;
  - renew or return from the borrower's list.
- **Rules** (Report & Rules):
  - loan days and the number of books at a time, separately for students and staff;
  - how many renewals are allowed;
  - how long a reserved book is kept;
  - a fine per day late (0 means no fines);
  - no new loans while a book is overdue.
  - The desk explains every refusal: "already on loan to …", "held for …", "the limit is 3", "has an overdue book", "blocked: …".
- **Members**: every student and staff member can have a card, made the first time they are needed. A member's record shows books on loan, history and fines. The office can **block borrowing** with a reason and print cards for many members at once.
- **Loans & Reservations**:
  - lists: on loan, **overdue**, fines to settle, returned, and the reservation queue;
  - renew, return and **mark lost** (the copy's price becomes the fine);
  - fines are marked paid or waived.
- **Reservations**: when every copy is out, a student, a parent (for any of their children) or a teacher reserves the book and gets a place in the queue. The first returned copy is held for them for the set number of days. If they don't collect it, it goes to the next person or back on the shelf.
- **Reminders** by portal notice and email, to the student and their parents, or to the member of staff:
  - the day before a book is due;
  - every 3 days while it is overdue;
  - when a reserved book is ready.
  - Run the command `send_library_reminders` once a day; it also releases holds nobody collected.
- **In the portals** (Library in the student, parent and teacher menus):
  - search the catalogue (with an "on the shelf now" filter) and reserve;
  - see books on loan with due dates, renew, see and cancel reservations, and see past reading;
  - parents switch between children.
- **Library report**: titles, copies, on loan, overdue, loans and readers in the last 90 days, waiting reservations, fines to collect, the most borrowed books, top readers, loans by subject and by month.
- Each school has its own library. Only the office runs the desk; everyone else only sees their own card.

**Built**
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