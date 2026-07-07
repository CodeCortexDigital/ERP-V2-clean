# Frontend Folder Structure

## Overview
The frontend is a React + TypeScript application built with Vite. The main application lives under `frontend/src`, with supporting config, test, and deployment files at the frontend root.

## Top-Level Frontend Tree
```text
frontend/
├── Dockerfile
├── .env.example
├── index.html
├── nginx.conf
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── NotificationBell.tsx
├── TeacherDashboard.tsx
├── services/
└── src/
```

## Source Tree Up To Depth 5
```text
src/
├── App.tsx
├── main.tsx
├── index.css
├── assets/
├── components/
│   ├── ai/
│   ├── auth/
│   ├── calendar/
│   ├── common/
│   ├── exams/
│   ├── layout/
│   ├── notifications/
│   └── ui/
├── config/
├── constants/
├── context/
├── contexts/
├── hooks/
├── layouts/
├── lib/
├── pages/
│   ├── auth/
│   ├── dashboard/
│   ├── education/
│   │   ├── academic-years/
│   │   ├── accreditation/
│   │   ├── admissions/
│   │   ├── attendance/
│   │   │   ├── alerts/
│   │   │   ├── dashboard/
│   │   │   ├── marking/
│   │   │   ├── parent-notify/
│   │   │   ├── reports/
│   │   │   ├── sessions/
│   │   │   └── summary/
│   │   ├── assignments/
│   │   │   ├── create/
│   │   │   ├── dashboard/
│   │   │   ├── extensions/
│   │   │   ├── groups/
│   │   │   ├── grading/
│   │   │   ├── submissions/
│   │   │   └── types/
│   │   ├── behaviour/
│   │   ├── billing/
│   │   │   ├── collection/
│   │   │   ├── dashboard/
│   │   │   ├── discounts/
│   │   │   ├── fee-structures/
│   │   │   ├── payment-plans/
│   │   │   ├── refunds/
│   │   │   └── student-accounts/
│   │   ├── campus/
│   │   ├── certificates/
│   │   ├── class-tests/
│   │   ├── counseling/
│   │   ├── course-scheduling/
│   │   ├── courses/
│   │   ├── curriculum/
│   │   │   ├── competencies/
│   │   │   ├── course-competencies/
│   │   │   ├── dashboard/
│   │   │   ├── mapping/
│   │   │   ├── outcomes/
│   │   │   └── versions/
│   │   ├── events/
│   │   ├── exams/
│   │   │   ├── dashboard/
│   │   │   ├── marksheets/
│   │   │   ├── malpractices/
│   │   │   ├── processing/
│   │   │   ├── registrations/
│   │   │   ├── results/
│   │   │   ├── schedules/
│   │   │   ├── types/
│   │   │   └── ...
│   │   ├── fees/
│   │   ├── finance/
│   │   ├── graduation/
│   │   ├── grading/
│   │   ├── homework/
│   │   ├── lms/
│   │   ├── library/
│   │   ├── live/
│   │   ├── parent-portal/
│   │   ├── portfolios/
│   │   ├── progress/
│   │   ├── programs/
│   │   ├── recruitment/
│   │   ├── scheduling/
│   │   │   ├── blocks/
│   │   │   ├── conflicts/
│   │   │   ├── dashboard/
│   │   │   ├── faculty/
│   │   │   ├── offerings/
│   │   │   ├── room-bookings/
│   │   │   ├── rooms/
│   │   │   ├── student/
│   │   │   └── timetable/
│   │   ├── scholarships/
│   │   ├── semesters/
│   │   ├── special-education/
│   │   ├── sports-eligibility/
│   │   ├── state-reporting/
│   │   ├── students/
│   │   ├── teachers/
│   │   ├── timetable/
│   │   ├── transportation/
│   │   ├── transcripts/
│   │   └── tutoring/
│   ├── portals/
│   │   ├── parent/
│   │   ├── student/
│   │   └── teacher/
│   ├── settings/
│   └── auth/
├── providers/
├── routes/
├── services/
├── store/
├── styles/
├── test/
├── types/
└── utils/
```

## Important Frontend Feature Areas
- Authentication pages and protected route handling
- Dashboard, analytics, and settings screens
- Student, teacher, and parent portal dashboards
- Education management modules for academics, attendance, admissions, exams, finance, curriculum, assignments, and scheduling
- Shared UI system with tables, forms, modals, badges, charts, and notifications
- API service layer for students, attendance, exams, finance, communication, analytics, and more
- State management with store modules and query providers
- Automated tests under `src/test`

## Notes
This tree is intentionally grouped by feature family so it remains readable at depth 4 to 5. Some files and folders in the repository root, such as `NotificationBell.tsx` and `TeacherDashboard.tsx`, are auxiliary entry points or preserved top-level components.


















>> param(
>>     [string]$Path = ".",
>>     [int]$MaxDepth = 5,
>>     [switch]$ShowFiles = $true,
>>     [switch]$ShowHidden = $false
>> )
>> 
>> # Exclude patterns
>> $ExcludePatterns = @(
>>     "node_modules",
>>     ".npx",
>>     "npx",
>>     ".cache",
>>     "dist",
>>     "build",
>>     ".next",
>>     ".nuxt",
>>     ".vite",
>>     "__pycache__",
>>     "*.log",
>>     "coverage",
>>     ".git",
>>     ".DS_Store",
>>     "*.tmp",
>>     "*.temp"
>> )
>> 
>> # Color codes
>> $FOLDER_COLOR = "`e[34m"
>> $FILE_COLOR = "`e[32m"
>> $NC = "`e[0m"
>> 
>> function Should-Exclude {
>>     param([string]$Name)
>>     foreach ($pattern in $ExcludePatterns) {
>>         if ($Name -like "*$pattern*") {
>>             return $true
>>         }
>>     }
>>     return $false
>> }
>> 
>> function Get-TreeStructure {
>>     param(
>>         [string]$CurrentPath,
>>         [string]$Prefix = "",
>>         [int]$Depth = 0,
>>         [bool]$IsLast = $true
>>     )
>>     
>>     if ($Depth -gt $MaxDepth) {
>>         return
>>     }
>>     
>>     try {
>>         # Get all items
>>         $items = Get-ChildItem -Path $CurrentPath -Force -ErrorAction SilentlyContinue | Where-Object {
>>             -not (Should-Exclude $_.Name)
>>         }
>>         
>>         # Separate folders and files
>>         $folders = $items | Where-Object { $_.PSIsContainer } | Sort-Object Name
>>         $files = $items | Where-Object { -not $_.PSIsContainer } | Sort-Object Name
>>         
>>         # Show files first or folders first? Let's show folders first for tree structure
>>         $allItems = @($folders) + @($files)
>>         
>>         for ($i = 0; $i -lt $allItems.Count; $i++) {
>>             $item = $allItems[$i]
>>             $isLastItem = ($i -eq $allItems.Count - 1)
>>             $isFolder = $item.PSIsContainer
>>             
>>             # Determine connector
>>             if ($isLastItem) {
>>                 $connector = "└── "
>>             } else {
>>                 $connector = "├── "
>>             }
>>             
>>             # Add indentation
>>             $indent = if ($Depth -gt 0) {
>>                 if ($IsLast) {
>>                     "    "
>>                 } else {
>>                     "│   "
>>                 }
>>             } else {
>>                 ""
>>             }
>>             
>>             # Build prefix for current level
>>             $currentPrefix = "$indent$connector"
>>             
>>             # Color the item
>>             if ($isFolder) {
>>                 # Show folder
>>                 $displayName = "${FOLDER_COLOR}📁 $($item.Name)/${NC}"
>>                 Write-Host "$Prefix$currentPrefix$displayName"
>>                 
>>                 # Recurse into folder
>>                 $newPrefix = if ($isLastItem) {
>>                     "$indent    "
>>                 } else {
>>                     "$indent│   "
>>                 }
>>                 
>>                 $newIsLast = $isLastItem
>>                 Get-TreeStructure -CurrentPath $item.FullName -Prefix "$indent" -Depth ($Depth + 1) -IsLast $isLastItem
>>             } else {
>>                 # Show file with size
>>                 if ($ShowFiles) {
>>                     $size = $item.Length
>>                     $sizeStr = if ($size -gt 1MB) {
>>                         "$([math]::Round($size / 1MB, 1)) MB"
>>                     } elseif ($size -gt 1KB) {
>>                         "$([math]::Round($size / 1KB, 1)) KB"
>>                     } else {
>>                         "$size B"
>>                     }
>>                     $displayName = "${FILE_COLOR}📄 $($item.Name) ($sizeStr)${NC}"
>>                     Write-Host "$Prefix$currentPrefix$displayName"
>>                 }
>>             }
>>         }
>>     } catch {
>>         # Skip inaccessible folders
>>     }
>> }
>> 
>> # Main execution
>> Write-Host "`n${FOLDER_COLOR}═══════════════════════════════════════════════════════════${NC}"
>> Write-Host "${FOLDER_COLOR}  FOLDER TREE STRUCTURE${NC}"
>> Write-Host "${FOLDER_COLOR}═══════════════════════════════════════════════════════════${NC}`n"
>> 
>> $fullPath = Resolve-Path $Path
>> Write-Host "${FOLDER_COLOR}📁 $fullPath${NC}`n"
>> 
>> Get-TreeStructure -CurrentPath $fullPath -Depth 0
>> 
>> Write-Host "`n${FOLDER_COLOR}═══════════════════════════════════════════════════════════${NC}"
>> Write-Host "Showing: $([math]::Round((Get-ChildItem $fullPath -Recurse -File | Where-Object { -not (Should-Exclude $_.Name) } | Measure-Object).Count)) files"
>> Write-Host "Max Depth: $MaxDepth"
>> Write-Host "${FOLDER_COLOR}═══════════════════════════════════════════════════════════${NC}"

═══════════════════════════════════════════════════════════
  FOLDER TREE STRUCTURE
═══════════════════════════════════════════════════════════

📁 D:\Code Cortex\03_Projects\Current\8_ERP-V2-clean\frontend

├── 📁 public/
│   └── 📄 favicon.ico (0 B)
├── 📁 services/
│   ├── 📁 analytics/
│   │   ├── 📄 urls.py (245 B)
│   │   └── 📄 views.py (1.3 KB)
│   └── 📁 core/
│       └── 📁 documents/
        ├── 📄 urls.py (133 B)
        └── 📄 views.py (526 B)
├── 📁 src/
│   ├── 📁 assets/
│   ├── 📁 components/
│   │   ├── 📁 ai/
│   │   └── 📄 AIChatbot.tsx (8.4 KB)
│   │   ├── 📁 auth/
│   │   ├── 📄 RoleBasedRoute.tsx (364 B)
│   │   └── 📄 SetPasswordModal.tsx (4.3 KB)
│   │   ├── 📁 calendar/
│   │   ├── 📄 StudentAttendanceCalendar.tsx (10.5 KB)
│   │   ├── 📄 TeacherAttendanceCalendar.tsx (12.6 KB)
│   │   └── 📄 TeacherAvailabilityCalendar.tsx (8.5 KB)
│   │   ├── 📁 common/
│   │   ├── 📄 CursorFollower.tsx (2.8 KB)
│   │   └── 📄 ToastNotification.tsx (2.9 KB)
│   │   ├── 📁 exams/
│   │   └── 📄 QuizGeneratorModal.tsx (13.2 KB)
│   │   ├── 📁 layout/
│   │   ├── 📄 Header.tsx (6.4 KB)
│   │   ├── 📄 Layout.tsx (2 KB)
│   │   ├── 📄 MenuDropdown.tsx (3.5 KB)
│   │   └── 📄 Sidebar.tsx (27.4 KB)
│   │   ├── 📁 notifications/
│   │   ├── 📄 NotificationBell.test.tsx (3.4 KB)
│   │   └── 📄 NotificationBell.tsx (4.2 KB)
│   │   ├── 📁 payments/
│   │   └── 📄 PaymentButton.tsx (1.6 KB)
│   │   ├── 📁 ui/
│   │   ├── 📄 Avatar.tsx (1.1 KB)
│   │   ├── 📄 Badge.tsx (1.4 KB)
│   │   ├── 📄 Breadcrumb.tsx (1.3 KB)
│   │   ├── 📄 BulkActions.tsx (3.5 KB)
│   │   ├── 📄 Button.tsx (1.8 KB)
│   │   ├── 📄 Card.tsx (1.9 KB)
│   │   ├── 📄 Charts.tsx (5.6 KB)
│   │   ├── 📄 Checkbox.tsx (1.6 KB)
│   │   ├── 📄 DataTable.tsx (5.4 KB)
│   │   ├── 📄 index.ts (454 B)
│   │   ├── 📄 Input.tsx (1.2 KB)
│   │   ├── 📄 Label.tsx (636 B)
│   │   ├── 📄 Modal.tsx (2 KB)
│   │   ├── 📄 Pagination.tsx (4 KB)
│   │   ├── 📄 Progress.tsx (846 B)
│   │   ├── 📄 SearchFilter.tsx (3.5 KB)
│   │   ├── 📄 Select.tsx (2.5 KB)
│   │   ├── 📄 Spinner.tsx (1.3 KB)
│   │   ├── 📄 Switch.tsx (1.3 KB)
│   │   ├── 📄 Table.tsx (2.9 KB)
│   │   ├── 📄 Tabs.tsx (3.5 KB)
│   │   ├── 📄 Textarea.tsx (1.1 KB)
│   │   └── 📄 Toast.tsx (1.2 KB)
│   │   ├── 📄 ClassSectionSelector.tsx (4.3 KB)
│   │   ├── 📄 CourseForm.tsx (5.8 KB)
│   │   ├── 📄 ExamForm.tsx (7.3 KB)
│   │   ├── 📄 Footer.tsx (0 B)
│   │   ├── 📄 Navbar.tsx (0 B)
│   │   ├── 📄 ProtectedRoute.tsx (690 B)
│   │   ├── 📄 SearchBar.tsx (5.4 KB)
│   │   └── 📄 StudentForm.tsx (4.5 KB)
│   ├── 📁 config/
│   │   ├── 📄 index.ts (1.7 KB)
│   │   └── 📄 sentry.tsx (717 B)
│   ├── 📁 constants/
│   │   └── 📄 index.ts (8.1 KB)
│   ├── 📁 context/
│   │   └── 📄 WebSocketContext.tsx (2.9 KB)
│   ├── 📁 contexts/
│   │   └── 📄 AuthContext.tsx (260 B)
│   ├── 📁 hooks/
│   │   ├── 📄 index.ts (438 B)
│   │   ├── 📄 useApi.ts (1.3 KB)
│   │   ├── 📄 useAsync.ts (2.2 KB)
│   │   ├── 📄 useAuth.ts (782 B)
│   │   ├── 📄 useDebounce.ts (419 B)
│   │   ├── 📄 useLocalStorage.ts (1.3 KB)
│   │   ├── 📄 useNotifications.ts (3.4 KB)
│   │   ├── 📄 usePermissions.ts (793 B)
│   │   ├── 📄 useStudentsQuery.ts (2.1 KB)
│   │   └── 📄 useWebSocket.ts (2.5 KB)
│   ├── 📁 layouts/
│   │   └── 📄 MainLayout.tsx (501 B)
│   ├── 📁 lib/
│   │   ├── 📄 api.ts (607 B)
│   │   ├── 📄 export.ts (4 KB)
│   │   ├── 📄 queryClient.ts (847 B)
│   │   ├── 📄 queryKeys.ts (1.2 KB)
│   │   ├── 📄 schemas.ts (2.7 KB)
│   │   └── 📄 utils.ts (170 B)
│   ├── 📁 pages/
│   │   ├── 📁 attendance/
│   │   ├── 📁 auth/
│   │   ├── 📄 ForgotPasswordPage.tsx (4.8 KB)
│   │   └── 📄 LoginPage.tsx (19.9 KB)
│   │   ├── 📁 dashboard/
│   │   └── 📄 DashboardPage.tsx (28.7 KB)
│   │   ├── 📁 education/
│   │   ├── 📁 academic-years/
│   │   └── 📄 AcademicYearsManagement.tsx (671 B)
│   │   ├── 📁 accreditation/
│   │   ├── 📁 bodies/
│   │   └── 📄 AccreditationBodies.tsx (3.8 KB)
│   │   ├── 📁 compliance/
│   │   └── 📄 ComplianceRecords.tsx (2.3 KB)
│   │   ├── 📁 standards/
│   │   └── 📄 StandardsManagement.tsx (2.9 KB)
│   │   └── 📄 AccreditationManagement.tsx (5.7 KB)
│   │   ├── 📁 admissions/
│   │   └── 📄 NewApplicationPage.tsx (4.4 KB)
│   │   ├── 📁 alumni/
│   │   └── 📄 AlumniManagement.tsx (5 KB)
│   │   ├── 📁 assignments/
│   │   ├── 📁 comments/
│   │   └── 📄 AssignmentComments.tsx (1.9 KB)
│   │   ├── 📁 create/
│   │   └── 📄 CreateAssignment.tsx (5.4 KB)
│   │   ├── 📁 dashboard/
│   │   └── 📄 AssignmentDashboard.tsx (3.9 KB)
│   │   ├── 📁 extensions/
│   │   └── 📄 AssignmentExtensions.tsx (2.6 KB)
│   │   ├── 📁 grading/
│   │   └── 📄 AssignmentGrading.tsx (2.4 KB)
│   │   ├── 📁 groups/
│   │   └── 📄 AssignmentGroups.tsx (3.6 KB)
│   │   ├── 📁 plagiarism/
│   │   └── 📄 PlagiarismCheck.tsx (2.1 KB)
│   │   ├── 📁 submissions/
│   │   └── 📄 StudentSubmissions.tsx (2.5 KB)
│   │   ├── 📁 types/
│   │   └── 📄 AssignmentTypes.tsx (2.9 KB)
│   │   ├── 📄 AssignmentsPage.tsx (3.2 KB)
│   │   └── 📄 HomeworkManagementPage.tsx (29.6 KB)
│   │   ├── 📁 attendance/
│   │   ├── 📁 alerts/
│   │   └── 📄 LowAttendanceAlerts.tsx (2.3 KB)
│   │   ├── 📁 course-summary/
│   │   └── 📄 CourseAttendanceSummary.tsx (2.5 KB)
│   │   ├── 📁 dashboard/
│   │   ├── 📄 AttendanceAnalyticsDashboard.tsx (15.5 KB)
│   │   └── 📄 AttendanceDashboard.tsx (266 B)
│   │   ├── 📁 marking/
│   │   └── 📄 MarkAttendance.tsx (18.7 KB)
│   │   ├── 📁 parent-notify/
│   │   └── 📄 ParentNotification.tsx (3.2 KB)
│   │   ├── 📁 reports/
│   │   └── 📄 AttendanceReports.tsx (260 B)
│   │   ├── 📁 sessions/
│   │   └── 📄 AttendanceSessions.tsx (263 B)
│   │   ├── 📁 summary/
│   │   └── 📄 AttendanceSummary.tsx (260 B)
│   │   ├── 📄 AttendanceListPage.tsx (263 B)
│   │   └── 📄 AttendancePage.tsx (110.1 KB)
│   │   ├── 📁 behaviour/
│   │   ├── 📄 AffectiveDomainReportPage.tsx (27.9 KB)
│   │   ├── 📄 ObservationsPage.tsx (33.7 KB)
│   │   ├── 📄 PsycomotorDomainReportPage.tsx (22.5 KB)
│   │   ├── 📄 RateBehavioursPage.tsx (24.3 KB)
│   │   └── 📄 RateSkillsPage.tsx (18.3 KB)
│   │   ├── 📁 billing/
│   │   ├── 📁 collection/
│   │   └── 📄 FeeCollection.tsx (2.2 KB)
│   │   ├── 📁 dashboard/
│   │   └── 📄 BillingDashboard.tsx (3.4 KB)
│   │   ├── 📁 discounts/
│   │   └── 📄 DiscountsManagement.tsx (6.4 KB)
│   │   ├── 📁 fee-structures/
│   │   └── 📄 FeeStructures.tsx (4.7 KB)
│   │   ├── 📁 payment-plans/
│   │   └── 📄 PaymentPlans.tsx (4.7 KB)
│   │   ├── 📁 refunds/
│   │   └── 📄 RefundProcessing.tsx (2.4 KB)
│   │   ├── 📁 reminders/
│   │   └── 📄 DueDateReminders.tsx (2.8 KB)
│   │   ├── 📁 student-accounts/
│   │   └── 📄 StudentAccounts.tsx (5.1 KB)
│   │   └── 📄 BillingManagement.tsx (3.1 KB)
│   │   ├── 📁 campus/
│   │   └── 📄 CampusManagement.tsx (3.1 KB)
│   │   ├── 📁 counseling/
│   │   └── 📄 CounselingManagement.tsx (3.6 KB)
│   │   ├── 📁 curriculum/
│   │   ├── 📁 competencies/
│   │   └── 📄 Competencies.tsx (1 KB)
│   │   ├── 📁 course-competencies/
│   │   └── 📄 CourseCompetencies.tsx (188 B)
│   │   ├── 📁 dashboard/
│   │   └── 📄 CurriculumDashboard.tsx (1.1 KB)
│   │   ├── 📁 mapping/
│   │   └── 📄 CurriculumMapping.tsx (189 B)
│   │   ├── 📁 outcomes/
│   │   └── 📄 LearningOutcomes.tsx (189 B)
│   │   ├── 📁 versions/
│   │   └── 📄 CurriculumVersions.tsx (191 B)
│   │   ├── 📄 CurriculumManagement.tsx (2.8 KB)
│   │   ├── 📄 ResourceManagement.tsx (9.5 KB)
│   │   ├── 📄 SyllabusManagement.tsx (21.5 KB)
│   │   └── 📄 TopicBreakdown.tsx (8.7 KB)
│   │   ├── 📁 donations/
│   │   └── 📄 DonationsManagement.tsx (602 B)
│   │   ├── 📁 events/
│   │   └── 📄 EventsManagement.tsx (592 B)
│   │   ├── 📁 exams/
│   │   ├── 📁 dashboard/
│   │   └── 📄 ExamDashboard.tsx (5.8 KB)
│   │   ├── 📁 malpractices/
│   │   └── 📄 ExamMalpractice.tsx (4.8 KB)
│   │   ├── 📁 marksheets/
│   │   └── 📄 MarkSheetGeneration.tsx (15.4 KB)
│   │   ├── 📁 processing/
│   │   └── 📄 ResultProcessing.tsx (7.2 KB)
│   │   ├── 📁 registrations/
│   │   └── 📄 ExamRegistrations.tsx (8 KB)
│   │   ├── 📁 results/
│   │   └── 📄 ExamResultsEntry.tsx (5.4 KB)
│   │   ├── 📁 schedules/
│   │   └── 📄 ExamSchedules.tsx (5.8 KB)
│   │   ├── 📁 types/
│   │   └── 📄 ExamTypes.tsx (7.7 KB)
│   │   ├── 📄 BlankAwardList.tsx (12.2 KB)
│   │   ├── 📄 DateSheet.tsx (11.4 KB)
│   │   ├── 📄 ExamAnalytics.tsx (7.1 KB)
│   │   ├── 📄 ExamDashboard.tsx (2.7 KB)
│   │   ├── 📄 ExaminationsManagement.tsx.backup (3.2 KB)
│   │   ├── 📄 ExamRegistrations.tsx (6.7 KB)
│   │   ├── 📄 ExamResultsEntry.tsx (4.4 KB)
│   │   ├── 📄 ExamResultsPage.tsx (10.7 KB)
│   │   ├── 📄 ExamSchedules.tsx (20.2 KB)
│   │   ├── 📄 ExamsListPage.tsx (10.9 KB)
│   │   └── 📄 ExamTypes.tsx (6.1 KB)
│   │   ├── 📁 finance/
│   │   ├── 📄 AccountStatementPage.tsx (17.3 KB)
│   │   ├── 📄 AddExpensePage.tsx (5.7 KB)
│   │   ├── 📄 AddIncomePage.tsx (5.7 KB)
│   │   ├── 📄 ChartOfAccountsPage.tsx (9.1 KB)
│   │   ├── 📄 CollectFeesPage.tsx (46.5 KB)
│   │   ├── 📄 DeleteFeesPage.tsx (12.3 KB)
│   │   ├── 📄 FeesDefaultersPage.tsx (21.8 KB)
│   │   ├── 📄 FeesPaidSlipPage.tsx (35.2 KB)
│   │   ├── 📄 FeesReportPage.tsx (16.8 KB)
│   │   ├── 📄 GenerateFeesInvoicePage.tsx (41.6 KB)
│   │   ├── 📄 GenerateSalaryPage.tsx (39.8 KB)
│   │   ├── 📄 PaySalaryPage.tsx (22.5 KB)
│   │   ├── 📄 SalaryPaidSlipPage.tsx (18.3 KB)
│   │   ├── 📄 SalaryReportPage.tsx (9.6 KB)
│   │   └── 📄 SalarySheetPage.tsx (13.2 KB)
│   │   ├── 📁 financial-aid/
│   │   └── 📄 FinancialAidManagement.tsx (2.9 KB)
│   │   ├── 📁 grade-scale/
│   │   └── 📄 GradeScaleManagement.tsx (2.2 KB)
│   │   ├── 📁 graduation/
│   │   └── 📄 GraduationManagement.tsx (5.1 KB)
│   │   ├── 📁 library/
│   │   └── 📄 LibraryManagement.tsx (4.5 KB)
│   │   ├── 📁 lms/
│   │   ├── 📁 connections/
│   │   └── 📄 LMSConnections.tsx (1.3 KB)
│   │   ├── 📁 dashboard/
│   │   └── 📄 LMSDashboard.tsx (932 B)
│   │   ├── 📁 settings/
│   │   └── 📄 LMSSettings.tsx (172 B)
│   │   ├── 📁 sync/
│   │   ├── 📁 courses/
│   │   ├── 📁 grades/
│   │   └── 📁 students/
│   │   └── 📄 LMSIntegration.tsx (2.6 KB)
│   │   ├── 📁 parent-portal/
│   │   └── 📄 ParentPortalManagement.tsx (4.2 KB)
│   │   ├── 📁 personalized-learning/
│   │   └── 📄 PersonalizedLearning.tsx (1.7 KB)
│   │   ├── 📁 portfolios/
│   │   └── 📄 PortfoliosManagement.tsx (4.2 KB)
│   │   ├── 📁 professional-dev/
│   │   └── 📄 ProfessionalDevelopment.tsx (5.2 KB)
│   │   ├── 📁 programs/
│   │   └── 📄 ProgramsManagement.tsx (591 B)
│   │   ├── 📁 progress/
│   │   ├── 📄 LessonPlannerPage.tsx (22.9 KB)
│   │   ├── 📄 ProgressTrackingPage.tsx (8.4 KB)
│   │   └── 📄 StudentProgressPage.tsx (18.3 KB)
│   │   ├── 📁 recruitment/
│   │   └── 📄 RecruitmentManagement.tsx (2.6 KB)
│   │   ├── 📁 scheduling/
│   │   ├── 📁 blocks/
│   │   └── 📄 ScheduleBlocks.tsx (186 B)
│   │   ├── 📁 conflicts/
│   │   └── 📄 ConflictDetection.tsx (186 B)
│   │   ├── 📁 dashboard/
│   │   └── 📄 SchedulingDashboard.tsx (1.2 KB)
│   │   ├── 📁 faculty/
│   │   └── 📄 FacultyTimetable.tsx (179 B)
│   │   ├── 📁 offerings/
│   │   └── 📄 CourseOfferings.tsx (724 B)
│   │   ├── 📁 room-bookings/
│   │   └── 📄 RoomBookings.tsx (168 B)
│   │   ├── 📁 rooms/
│   │   └── 📄 RoomManagement.tsx (185 B)
│   │   ├── 📁 student/
│   │   └── 📄 StudentTimetable.tsx (185 B)
│   │   ├── 📁 timetable/
│   │   └── 📄 TimetableGenerator.tsx (1.3 KB)
│   │   └── 📄 CourseScheduling.tsx (3 KB)
│   │   ├── 📁 scholarships/
│   │   └── 📄 ScholarshipsManagement.tsx (2.9 KB)
│   │   ├── 📁 semesters/
│   │   └── 📄 SemestersManagement.tsx (596 B)
│   │   ├── 📁 special-education/
│   │   └── 📄 SpecialEducationManagement.tsx (3.7 KB)
│   │   ├── 📁 sports-eligibility/
│   │   └── 📄 SportsEligibility.tsx (532 B)
│   │   ├── 📁 state-reporting/
│   │   └── 📄 StateReporting.tsx (653 B)
│   │   ├── 📁 students/
│   │   ├── 📄 AddStudentPage.tsx (35.9 KB)
│   │   ├── 📄 AdmissionLetterPage.tsx (22.8 KB)
│   │   ├── 📄 EditStudentPage.tsx (43 KB)
│   │   ├── 📄 PrintBasicListPage.tsx (12.7 KB)
│   │   ├── 📄 PromoteStudentsPage.tsx (16.3 KB)
│   │   ├── 📄 StudentIdCardsPage.tsx (8.6 KB)
│   │   ├── 📄 StudentLoginsPage.tsx (18.8 KB)
│   │   ├── 📄 StudentProfilePage.tsx (20.8 KB)
│   │   ├── 📄 urls.py (1.9 KB)
│   │   └── 📄 views.py (1.6 KB)
│   │   ├── 📁 teachers/
│   │   ├── 📄 AddTeacherPage.tsx (16.4 KB)
│   │   ├── 📄 EditTeacherPage.tsx (18.1 KB)
│   │   ├── 📄 JobLetterPage.tsx (21.6 KB)
│   │   ├── 📄 StaffIdCardsPage.tsx (8.9 KB)
│   │   ├── 📄 StaffLoginsPage.tsx (17.7 KB)
│   │   ├── 📄 TeacherProfilePage.tsx (17.4 KB)
│   │   └── 📄 TeachersManagement.tsx (10.6 KB)
│   │   ├── 📁 timetable/
│   │   ├── 📄 ClassroomManagementPage.tsx (28 KB)
│   │   ├── 📄 ClassTimetableListPage.tsx (9.7 KB)
│   │   ├── 📄 PeriodManagementPage.tsx (14.3 KB)
│   │   ├── 📄 TeacherTimetableListPage.tsx (9.7 KB)
│   │   ├── 📄 TimetableEditorPage.tsx (42 KB)
│   │   ├── 📄 TimetableManagement.tsx (38.8 KB)
│   │   ├── 📄 TimetableViewPage.tsx (12.5 KB)
│   │   └── 📄 WeekdayManagementPage.tsx (8.4 KB)
│   │   ├── 📁 transcripts/
│   │   ├── 📁 dashboard/
│   │   └── 📄 TranscriptDashboard.tsx (4.8 KB)
│   │   ├── 📁 generate/
│   │   └── 📄 GenerateTranscript.tsx (4.8 KB)
│   │   ├── 📁 requests/
│   │   └── 📄 TranscriptRequests.tsx (6 KB)
│   │   ├── 📁 templates/
│   │   └── 📄 TranscriptTemplates.tsx (4.2 KB)
│   │   ├── 📁 verify/
│   │   └── 📄 DigitalVerification.tsx (4.7 KB)
│   │   └── 📄 TranscriptsManagement.tsx (684 B)
│   │   ├── 📁 transportation/
│   │   └── 📄 TransportationManagement.tsx (3.5 KB)
│   │   ├── 📁 tuition/
│   │   └── 📄 TuitionManagement.tsx (4.7 KB)
│   │   ├── 📄 AcademicsPage.tsx (31.2 KB)
│   │   ├── 📄 AcademicsPage.tsx.backup (26.2 KB)
│   │   ├── 📄 AdmissionsPage.tsx (8 KB)
│   │   ├── 📄 AnalyticsPage.tsx (77.9 KB)
│   │   ├── 📄 CertificatesPage.tsx (49.3 KB)
│   │   ├── 📄 ClassTestsPage.tsx (35.2 KB)
│   │   ├── 📄 CommunicationPage.tsx (6.1 KB)
│   │   ├── 📄 CoursesListPage.tsx (6.1 KB)
│   │   ├── 📄 ExamsPage.tsx (43.4 KB)
│   │   ├── 📄 FeesPage.tsx (243 B)
│   │   ├── 📄 FinancePage.tsx (117.9 KB)
│   │   ├── 📄 FinancePage.tsx.backup_20260511_010622 (80.4 KB)
│   │   ├── 📄 index.ts (425 B)
│   │   ├── 📄 LiveClassPage.tsx (15.2 KB)
│   │   ├── 📄 LiveRoomPage.tsx (11.4 KB)
│   │   ├── 📄 scratch_report.txt (324 B)
│   │   ├── 📄 StudentsListPage.tsx (16.1 KB)
│   │   └── 📄 StudentsListPage.tsx.bak (25.7 KB)
│   │   ├── 📁 portals/
│   │   ├── 📁 parent/
│   │   └── 📄 ParentDashboard.tsx (991 B)
│   │   ├── 📁 student/
│   │   └── 📄 StudentDashboard.tsx (20.4 KB)
│   │   └── 📁 teacher/
│       └── 📄 TeacherDashboard.tsx (17.5 KB)
│   │   ├── 📁 settings/
│   │   ├── 📄 FeatureFlagsPage.tsx (8.6 KB)
│   │   └── 📄 SettingsPage.tsx (71.4 KB)
│   │   ├── 📄 Analytics.tsx (9.9 KB)
│   │   └── 📄 DashboardPage.tsx (4.2 KB)
│   ├── 📁 providers/
│   │   ├── 📄 AuthInitializer.tsx (748 B)
│   │   └── 📄 QueryProvider.tsx (316 B)
│   ├── 📁 routes/
│   │   └── 📄 index.tsx (11.2 KB)
│   ├── 📁 services/
│   │   ├── 📄 academic.service.ts (28 KB)
│   │   ├── 📄 academics.service.ts (2 KB)
│   │   ├── 📄 admission.service.ts (666 B)
│   │   ├── 📄 admissions.service.ts (2 KB)
│   │   ├── 📄 analytics.service.ts (947 B)
│   │   ├── 📄 api.ts (1.5 KB)
│   │   ├── 📄 apiEndpoints.ts (1.4 KB)
│   │   ├── 📄 attendance.service.ts (3.1 KB)
│   │   ├── 📄 auth.service.ts (1.8 KB)
│   │   ├── 📄 class.service.ts (1 KB)
│   │   ├── 📄 classSection.service.ts (949 B)
│   │   ├── 📄 communication.service.ts (270 B)
│   │   ├── 📄 course.service.ts (921 B)
│   │   ├── 📄 curriculum.service.ts (3 KB)
│   │   ├── 📄 exam.service.ts (1.7 KB)
│   │   ├── 📄 feature.service.ts (1.4 KB)
│   │   ├── 📄 finance.service.ts (7.8 KB)
│   │   ├── 📄 firebase.ts (944 B)
│   │   ├── 📄 index.ts (382 B)
│   │   ├── 📄 notification.service.ts (1.5 KB)
│   │   ├── 📄 pdf.service.ts (1.4 KB)
│   │   ├── 📄 search.service.ts (565 B)
│   │   ├── 📄 section.service.ts (546 B)
│   │   ├── 📄 student.service.ts (5.8 KB)
│   │   ├── 📄 teacher.service.ts (1.5 KB)
│   │   └── 📄 websocket.service.ts (7.2 KB)
│   ├── 📁 store/
│   │   ├── 📄 appStore.ts (3 KB)
│   │   ├── 📄 authStore.ts (5.9 KB)
│   │   ├── 📄 index.ts (325 B)
│   │   ├── 📄 notificationStore.ts (4.1 KB)
│   │   └── 📄 uiStore.ts (132 B)
│   ├── 📁 styles/
│   │   └── 📄 themes.ts (1.4 KB)
│   ├── 📁 test/
│   │   ├── 📄 setup.ts (1.3 KB)
│   │   ├── 📄 test_login.spec.tsx (8.5 KB)
│   │   ├── 📄 test_parent_portal.spec.tsx (6.7 KB)
│   │   ├── 📄 test_teacher_portal.spec.tsx (8.8 KB)
│   │   └── 📄 testUtils.tsx (2.1 KB)
│   ├── 📁 types/
│   │   └── 📄 index.ts (998 B)
│   ├── 📁 utils/
│   │   ├── 📄 errorHandler.tsx (5.6 KB)
│   │   ├── 📄 exportHelper.ts (10.5 KB)
│   │   ├── 📄 fileUpload.ts (4.3 KB)
│   │   └── 📄 systemAudit.ts (12.8 KB)
│   ├── 📄 App.tsx (16.9 KB)
│   ├── 📄 App.tsx.audit_backup (2.9 KB)
│   ├── 📄 App.tsx.backup (0 B)
│   ├── 📄 App.tsx.broken (3 KB)
│   ├── 📄 index.css (1.6 KB)
│   ├── 📄 index.css.bak (1.5 KB)
│   ├── 📄 main.tsx (521 B)
│   └── 📄 vite-env.d.ts (37 B)
├── 📄 .env.example (873 B)
├── 📄 Dockerfile (544 B)
├── 📄 index.html (397 B)
├── 📄 nginx.conf (2.8 KB)
├── 📄 NotificationBell.tsx (4.5 KB)
├── 📄 package-lock.json (277.1 KB)
├── 📄 package.json (1.8 KB)
├── 📄 postcss.config.js (84 B)
├── 📄 README.md (17.5 KB)
├── 📄 tailwind.config.js (1.5 KB)
├── 📄 TeacherDashboard.tsx (3.4 KB)
├── 📄 tsconfig.app.json (215 B)
├── 📄 tsconfig.json (705 B)
├── 📄 tsconfig.node.json (302 B)
├── 📄 vite.config.ts (684 B)
└── 📄 vitest.config.ts (710 B)

═══════════════════════════════════════════════════════════
Showing: 37571 files
Max Depth: 5
═══════════════════════════════════════════════════════════
PS D:\Code Cortex\03_Projects\Current\8_ERP-V2-clean\frontend>