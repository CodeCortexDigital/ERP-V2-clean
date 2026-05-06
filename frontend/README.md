cd "D:\Code Cortex\03_Projects\Current\8_ERP-V2-clean"

Write-Host "📝 Generating Frontend Requirements Document..." -ForegroundColor Cyan

$outputFile = "FRONTEND_REQUIREMENTS.txt"

@"
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                    FRONTEND DEVELOPMENT REQUIREMENTS - COMPLETE AUDIT                 ║
╚══════════════════════════════════════════════════════════════════════════════════════╝

Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 1: STUDENT MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED PAGES:
1. Student List Page (Table View with pagination)
2. Student Detail Page (360° Profile View with tabs)
3. Student Add/Edit Form
4. Student Import/Export Page

UI COMPONENTS NEEDED:
• DataTable with pagination, sorting, filtering
• Search bar (search by name, ID, email)
• Status badges (Active/Inactive)
• Profile card with avatar
• Tabbed interface for 360° view

FORM FIELDS (STUDENT):
✓ student_id: CharField (required, unique)
✓ full_name: CharField (required)
✓ email: EmailField (required, unique)
○ phone: CharField (optional)
○ father_name: CharField (optional)
○ mother_name: CharField (optional)
○ guardian_phone: CharField (optional)
○ guardian_email: EmailField (optional)
○ enrollment_date: DateField (optional)
○ program: CharField (optional)
○ current_semester: IntegerField (default: 1)
○ emergency_contact_name: CharField (optional)
○ emergency_contact_phone: CharField (optional)
○ current_class: ForeignKey (dropdown from SchoolClass)
○ current_section: ForeignKey (dropdown from Section)
✓ is_active: BooleanField (checkbox, default: true)

UI REQUIREMENTS:
• Student List: Display student_id, full_name, email, phone, current_class, status
• Quick Actions: Edit, Delete, View Profile, Send Message
• Bulk Actions: Delete, Export, Send Notification
• Filters: By class, section, status, enrollment date range
• 360° Dashboard Tabs: Overview, Attendance, Exams, Finance, Communications

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 2: ATTENDANCE MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED PAGES:
1. Mark Attendance Page (Grid/Matrix View)
2. Attendance List Page
3. Attendance Summary/Dashboard
4. Student Attendance Report

UI COMPONENTS NEEDED:
• Calendar view for date selection
• Class/Section selector dropdown
• Student grid with Present/Absent/Late buttons
• Save button with confirmation
• Progress bar for attendance rate
• Color-coded status badges (Green=Present, Red=Absent, Orange=Late)

FORM FIELDS (ATTENDANCE):
✓ student: ForeignKey (required)
✓ date: DateField (required)
✓ status: CharField (required - choices: present, absent, late, excused)
○ remarks: TextField (optional)

UI REQUIREMENTS:
• Class Selection: Dropdown with class → section hierarchy
• Date Picker: Default to current date
• Student Table: Buttons per student with status options
• Quick Actions: Mark All Present, Mark All Absent
• Auto-save or Save Draft
• Attendance Reports: With filters by date range, class, student

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 3: EXAM MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED PAGES:
1. Exam List Page
2. Exam Add/Edit Form
3. Exam Schedule (Calendar View)
4. Result Entry Page
5. Result Card/Report Card View

UI COMPONENTS NEEDED:
• Calendar/Scheduler for exam dates
• DataTable for exam list
• Marks entry grid (student × subject)
• Auto-calculation of percentage and grade
• Result card template
• Export to PDF (Report Card)

EXAM FIELDS:
✓ code: CharField (required)
✓ title: CharField (required)
○ description: TextField (optional)
○ exam_date: DateField (optional)
✓ duration_minutes: IntegerField (required)
✓ total_marks: DecimalField (required, default: 100)
✓ passing_marks: DecimalField (required, default: 40)
✓ status: CharField (required - choices: scheduled, ongoing, completed, cancelled)

EXAM RESULT FIELDS:
✓ exam: ForeignKey (required)
✓ student: ForeignKey (required)
○ roll_number: CharField (optional)
✓ obtained_marks: DecimalField (required)
✓ total_marks: DecimalField (required)
• percentage: READONLY (auto-calculated)
• grade: READONLY (auto-calculated A+, A, B, C, D, F)
• is_pass: READONLY (auto-calculated)
○ remarks: TextField (optional)

UI REQUIREMENTS:
• Exam List: Title, code, date, status, total_marks
• Result Entry: Matrix with student names, marks input, auto grade
• Grade Calculation: Instant feedback on marks entry
• Publish Results: Button with confirmation (triggers WhatsApp)
• Student View: Result card showing marks, percentage, grade

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 4: FINANCE MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED PAGES:
1. Fee Structure Management
2. Invoice List Page
3. Generate Invoice Page
4. Payment Collection Page
5. Payment History
6. Student Fee Status Dashboard

UI COMPONENTS NEEDED:
• Invoice template (print-friendly)
• Payment gateway integration (optional)
• Receipt generator
• Due date calculator
• Balance summary cards
• Overdue alerts

INVOICE FIELDS:
✓ invoice_number: CharField (required, auto-generated)
✓ student: ForeignKey (required)
✓ amount: DecimalField (required)
✓ paid_amount: DecimalField (required, default: 0)
✓ due_date: DateField (required)
✓ status: CharField (required - choices: pending, paid, partial, overdue)

PAYMENT FIELDS:
✓ payment_id: CharField (required, auto-generated)
✓ invoice: ForeignKey (required)
✓ amount: DecimalField (required)
○ payment_date: DateField (optional)
✓ payment_method: CharField (required - choices: cash, card, bank_transfer, online)
○ transaction_id: CharField (optional)
✓ status: CharField (required - choices: pending, completed, failed)

UI REQUIREMENTS:
• Student Search: Autocomplete for student selection
• Fee Structure: Predefined fee types with amounts
• Invoice Preview: Before final generation
• Payment Form: Amount, method, transaction ID
• Payment Status: Paid, Partial, Overdue badges
• Send Reminder: Button to trigger WhatsApp reminder

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 5: COMMUNICATION & AUTOMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED PAGES:
1. Message Center (Inbox/Outbox)
2. Compose Message (WhatsApp/Email/SMS)
3. Template Management
4. Auto-Trigger Configuration
5. WhatsApp Settings
6. Notification History

UI COMPONENTS NEEDED:
• Rich text editor with variable insertion
• Variable selector dropdown ({{student_name}}, {{amount}}, etc.)
• Channel selector (WhatsApp/Email/SMS/In-app)
• Recipient selector (Individual/Group/All)
• Preview before send
• Delivery status indicators

MESSAGE FIELDS:
○ student: ForeignKey (optional)
✓ sender: CharField (required)
✓ recipient: CharField (required)
○ recipient_phone: CharField (optional)
○ recipient_email: EmailField (optional)
○ subject: CharField (optional)
✓ message: TextField (required)
✓ channel: CharField (required - choices: whatsapp, sms, email, in_app)
✓ is_delivered: BooleanField (checkbox)

TEMPLATE FIELDS:
✓ name: CharField (required)
✓ template_type: CharField (required - choices: fee_reminder, attendance_alert, exam_result, etc.)
○ subject: CharField (optional)
✓ body: TextField (required)
○ variables: JSONField (list of variable names)
✓ is_active: BooleanField (checkbox)

AUTO-TRIGGER FIELDS:
✓ name: CharField (required)
✓ trigger_event: CharField (required - choices: attendance_low, fee_due_soon, fee_overdue, exam_result_published)
✓ template: ForeignKey (required)
✓ channel: CharField (required, default: whatsapp)
✓ is_active: BooleanField (checkbox)
○ days_before: IntegerField (default: 0)

UI REQUIREMENTS:
• Template Editor: WYSIWYG with variable insertion
• Trigger Rules: Condition builder (If attendance < 75% Then...)
• Test Message: Send test to specific number
• Analytics: Message delivery success rate
• Webhook Status: WhatsApp configuration status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 6: ACADEMICS MANAGEMENT (Hierarchy)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED PAGES:
1. Academic Year Management
2. Program/Course Management
3. Class & Section Management (Tree View)
4. Subject Allocation

UI COMPONENTS NEEDED:
• Tree/Nested view for hierarchy
• Drag-and-drop reordering
• Collapsible sections
• Multi-level selectors

HIERARCHY STRUCTURE:
   Academic Year
   └── Program
       └── SchoolClass
           └── Section
               └── Students

UI must support this nested navigation!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 7: ADMISSIONS MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED PAGES:
1. Online Application Form (Public)
2. Applicant List (Admin)
3. Application Review Page
4. Convert to Student (Action Button)

UI COMPONENTS NEEDED:
• Multi-step wizard form
• File upload (documents)
• Status tracking timeline
• Decision buttons (Accept/Reject/Waitlist)

APPLICATION STATUS FLOW:
   New → Under Review → Accepted/Rejected → Enrolled

• Convert to Student: One-click action when Accepted

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 8: ANALYTICS & SMART INSIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED PAGES:
1. Dashboard Overview (KPI Cards)
2. Student Risk Dashboard
3. Performance Analytics
4. Class/Section Reports

UI COMPONENTS NEEDED:
• Chart.js / Recharts integration
• Heat maps for attendance
• Trend lines for performance
• Risk indicator cards (Red/Orange/Yellow/Green)
• Export charts as images

METRICS TO DISPLAY:
• Total Students vs Active
• Average Attendance Rate
• Average Exam Score
• Fee Collection Rate
• At-Risk Students Count
• Upcoming Exams
• Recent Notifications

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FRONTEND DEVELOPMENT CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAGES TO BUILD (Priority Order):

P0 - MUST HAVE (Core Functionality):
   □ 1. Login/Authentication Page
   □ 2. Dashboard with KPI cards
   □ 3. Student List with CRUD
   □ 4. Student 360° Profile View
   □ 5. Attendance Marking Page
   □ 6. Exam Result Entry Page

P1 - IMPORTANT (Business Logic):
   □ 7. Course/Class Management
   □ 8. Fee/Invoice Management
   □ 9. Payment Collection
   □ 10. Admissions Processing
   □ 11. Communication/Messaging

P2 - NICE TO HAVE (Automation & Insights):
   □ 12. WhatsApp Integration UI
   □ 13. Auto-Trigger Configuration
   □ 14. Analytics Dashboard
   □ 15. Student Risk Assessment View
   □ 16. Bulk Import/Export

UI COMPONENTS NEEDED:
   □ DataTable (with sort, filter, pagination)
   □ Form Builder (with validation)
   □ Modal Dialog
   □ Toast Notifications
   □ Tabs Component
   □ Date Picker
   □ Select Dropdown (with search)
   □ File Uploader
   □ Rich Text Editor
   □ Chart Library
   □ Calendar/Scheduler
   □ Progress Bar
   □ Status Badges

DESIGN REQUIREMENTS:
   • Responsive (Mobile, Tablet, Desktop)
   • Dark/Light theme support
   • Accessibility (WCAG 2.1)
   • Loading states (Skeleton screens)
   • Error boundaries
   • Form validation with inline errors
   • Confirmation dialogs for destructive actions

API INTEGRATION CHECKLIST:
   □ Connect Student List → GET /api/auth/students/
   □ Connect Student Detail → GET /api/education/students/student-360/{id}/
   □ Connect Student Create → POST /api/auth/students/
   □ Connect Student Update → PUT /api/auth/students/{id}/
   □ Connect Student Delete → DELETE /api/auth/students/{id}/
   □ Connect Attendance → GET/POST /api/auth/attendance/
   □ Connect Exams → GET /api/auth/exams/
   □ Connect Results → POST /api/auth/exams/results/
   □ Connect Finance → GET /api/auth/invoices/
   □ Connect Messages → POST /api/communication/messages/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ AUDIT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"@ | Out-File -FilePath $outputFile -Encoding utf8

Write-Host ""
Write-Host "✅ Frontend requirements saved to: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "File contains:" -ForegroundColor Yellow
Write-Host "  • 8 modules with all fields" -ForegroundColor Gray
Write-Host "  • Required pages per module" -ForegroundColor Gray
Write-Host "  • UI components checklist" -ForegroundColor Gray
Write-Host "  • Priority P0/P1/P2 tasks" -ForegroundColor Gray
Write-Host "  • API endpoints" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Share FRONTEND_REQUIREMENTS.txt with frontend developer!" -ForegroundColor Cyan




dtudent and attendance completed