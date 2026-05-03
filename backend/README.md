## 📊 BACKEND AUDIT - Models & Admin Forms Discussion

Let me give you a comprehensive overview of all backend models and their admin interfaces:

---

## 🎯 1. STUDENTS MODULE

### Model: `Student` (20 fields)

**Admin Form Fields Used:**
- `student_id` - Unique identifier (auto-generated)
- `full_name` - Required
- `email` - Unique, required
- `phone` - Optional
- `father_name`, `mother_name` - Optional
- `guardian_phone`, `guardian_email` - Optional
- `enrollment_date` - Date picker
- `program` - Text input
- `current_semester` - Number input (default: 1)
- `emergency_contact_name`, `emergency_contact_phone` - Optional
- `current_class` - Dropdown (from SchoolClass)
- `current_section` - Dropdown (from Section)
- `is_active` - Checkbox (default: True)
- `tenant_id` - Hidden (auto-filled for multi-tenant)

**Admin List Display:** student_id, full_name, email, current_class, is_active

**Search Fields:** full_name, email, student_id

**Filters:** is_active, current_class

---

## 🎓 2. ACADEMICS MODULE

### Model: `AcademicYear`
**Fields:** name, start_date, end_date, is_current, is_active, tenant_id
**Admin:** List display with year range, filter by is_current

### Model: `Program`
**Fields:** code, name, duration_years, description, is_active, tenant_id
**Admin:** List by code, name, duration

### Model: `Course`
**Fields:** code, name, credits, level, description, is_active, tenant_id
**Admin:** List with code, name, credits, filter by is_active

### Model: `SchoolClass`
**Fields:** name, code, academic_year (FK dropdown), teacher_name, teacher_email, capacity, is_active, tenant_id
**Admin:** List by code, name, academic_year, capacity

### Model: `Section`
**Fields:** class_ref (FK dropdown), name, code, capacity, is_active, tenant_id
**Admin:** Grouped by class, list as "Class - Section"

---

## 📅 3. ATTENDANCE MODULE

### Model: `AttendanceRecord`
**Fields:** 
- `student` - Autocomplete search (from Student)
- `course_id` - Text input
- `date` - Date picker
- `status` - Dropdown options: Present, Absent, Late, Excused
- `remarks` - Textarea (optional)
- `tenant_id` - Hidden

**Admin Options:**
- **List Display:** student, date, status, created_at
- **Filters:** status, date
- **Search:** student__full_name, student__student_id
- **Bulk Actions:** Mark as Present/Absent for selected

---

## 📝 4. EXAMS MODULE

### Model: `Exam`
**Fields:**
- `code` - Unique identifier
- `title` - Exam name
- `description` - Textarea
- `exam_date` - Date picker
- `duration_minutes` - Number input
- `total_marks` - Decimal (default: 100)
- `passing_marks` - Decimal (default: 40)
- `status` - Dropdown: scheduled, ongoing, completed, cancelled
- `is_active` - Checkbox
- `tenant_id` - Hidden

### Model: `ExamResult`
**Fields:**
- `exam` - FK dropdown (searchable)
- `student` - FK autocomplete (from Student)
- `roll_number` - Text (optional)
- `obtained_marks` - Decimal input
- `total_marks` - Decimal (auto-filled from exam)
- `percentage` - Auto-calculated (read-only)
- `grade` - Auto-calculated (read-only: A+, A, B, C, D, F)
- `is_pass` - Auto-calculated (read-only)
- `remarks` - Textarea
- `entered_by` - Auto-filled with logged-in user
- `tenant_id` - Hidden

**Admin Auto-Calculation Logic:**
- Percentage = (obtained/total) × 100
- Grade based on percentage (80%+ = A+, 70%+ = A, etc.)
- Pass if percentage >= 40%

**Admin List Display:** exam, student, obtained_marks, percentage, grade, is_pass
**Filters:** is_pass, exam

---

## 💰 5. FINANCE MODULE

### Model: `FeeStructure`
**Fields:**
- `name` - Fee type name (e.g., "Tuition Fee")
- `amount` - Decimal
- `frequency` - Dropdown: monthly, quarterly, yearly, one-time
- `is_active` - Checkbox
- `tenant_id` - Hidden

### Model: `Invoice`
**Fields:**
- `invoice_number` - Auto-generated (unique)
- `student` - FK autocomplete
- `amount` - Decimal
- `paid_amount` - Decimal (default: 0)
- `due_date` - Date picker
- `status` - Dropdown: pending, paid, partial, overdue, cancelled
- `tenant_id` - Hidden

**Admin Calculated Field:** `balance` = amount - paid_amount

**Admin Actions:** 
- Mark as Paid
- Send Reminder (triggers WhatsApp)
- Generate Receipt PDF

### Model: `Payment`
**Fields:**
- `payment_id` - Auto-generated
- `invoice` - FK dropdown
- `amount` - Decimal
- `payment_date` - Date picker (default: today)
- `payment_method` - Dropdown: cash, card, bank_transfer, online
- `transaction_id` - Optional (for online payments)
- `status` - Dropdown: pending, completed, failed, refunded
- `tenant_id` - Hidden

---

## 📢 6. COMMUNICATION MODULE

### Model: `Message`
**Fields:**
- `student` - FK autocomplete (optional - links to Student)
- `sender` - Auto-filled (logged-in user)
- `recipient` - Text (student/parent name)
- `recipient_phone` - Phone number (for WhatsApp)
- `recipient_email` - Email (for email)
- `subject` - Text
- `message` - Textarea (supports variables like {{student_name}})
- `channel` - Dropdown: whatsapp, sms, email, in_app
- `is_delivered` - Checkbox (auto-updated)
- `delivered_at` - DateTime (auto when delivered)
- `tenant_id` - Hidden

### Model: `MessageTemplate`
**Fields:**
- `name` - Template name
- `template_type` - Dropdown: fee_reminder, attendance_alert, exam_result, admission_confirmation, payment_receipt, birthday_wish, custom
- `subject` - Text
- `body` - Textarea with variable placeholders
- `variables` - JSON (stores variable list like ["student_name", "amount"])
- `is_active` - Checkbox
- `tenant_id` - Hidden

**Template Variables Example:**
```html
Dear {{student_name}},
Your attendance is {{attendance_rate}}%. Please improve.
{{class_name}}, {{due_date}}
```

### Model: `AutoTrigger`
**Fields:**
- `name` - Trigger name
- `trigger_event` - Dropdown: attendance_low, fee_due_soon, fee_overdue, exam_result_published, student_birthday, admission_accepted
- `template` - FK dropdown (from MessageTemplate)
- `channel` - Dropdown (default: whatsapp)
- `is_active` - Checkbox
- `days_before` - Number (days before/after event to trigger)
- `tenant_id` - Hidden

### Model: `WhatsAppConfig`
**Fields:**
- `api_key` - Text (encrypted)
- `phone_number_id` - WhatsApp Business API
- `business_account_id` - Meta Business account
- `webhook_verified` - Checkbox
- `is_active` - Checkbox
- `tenant_id` - Hidden

---

## 🎓 7. ADMISSIONS MODULE

### Model: `Applicant`
**Fields:**
- `applicant_id` - Auto-generated
- `first_name`, `last_name` - Required
- `email`, `phone` - Contact
- `date_of_birth` - Date picker
- `gender` - Dropdown: Male, Female, Other
- `address`, `city`, `state`, `postal_code`, `country` - Address fields
- `previous_institution`, `previous_qualification`, `previous_percentage` - Education history
- `applying_for` - Program applying to (text)
- `status` - Dropdown: new, under_review, accepted, rejected, enrolled
- `tenant_id` - Hidden

### Model: `Application`
**Fields:**
- `application_number` - Auto-generated unique
- `applicant` - FK dropdown (searchable)
- `program` - Text (applied program)
- `semester` - Text
- `academic_year` - Text
- `documents` - JSON field (stores uploaded document URLs)
- `notes` - Textarea (internal notes)
- `status` - Dropdown: pending, reviewed, accepted, rejected, enrolled
- `tenant_id` - Hidden

**Custom Action:** "Convert to Student" - Creates Student record from approved application

---

## 🧠 8. ANALYTICS MODULE

### Model: `StudentRisk`
**Fields:**
- `student` - FK autocomplete
- `risk_level` - Dropdown: low, medium, high, critical (auto-calculated)
- `risk_score` - Decimal 0-100 (auto-calculated)
- `factors` - JSON (stores risk factors like "Low attendance: 65%")
- `recommendations` - JSON (actionable steps)
- `assessed_at` - DateTime (auto)
- `is_resolved` - Checkbox
- `tenant_id` - Hidden

**Risk Calculation Logic (Auto):**
- Attendance < 70% → +40 points
- Average marks < 50% → +40 points  
- Fee balance > 50000 → +20 points
- Score 70+ = critical, 50-69 = high, 30-49 = medium, <30 = low

### Model: `AcademicPrediction`
**Fields:**
- `student` - FK
- `predicted_grade` - Text (A+, A, B, etc.)
- `confidence` - Decimal 0-100
- `factors` - JSON (factors affecting prediction)
- `created_at` - DateTime

### Model: `Recommendation`
**Fields:**
- `student` - FK
- `recommendation_type` - Dropdown: academic, attendance, financial, behavioral
- `title` - Text
- `description` - Textarea
- `action_items` - JSON (list of actions)
- `is_implemented` - Checkbox
- `created_at` - DateTime

---

## 👥 9. USERS & AUTH MODULE

### Model: `User` (Custom)
**Key Fields Visible in Admin:**
- `email` - Required, unique (used as username)
- `full_name` - Display name
- `phone_number` - Optional
- `is_active` - Checkbox
- `is_staff` - Checkbox (admin access)
- `is_superuser` - Checkbox (full access)
- `groups` - Many-to-many (role assignment)
- `user_permissions` - Many-to-many

**Admin Groups Pre-configured:**
- Admin - Full system access
- School Admin - Multi-tenant admin
- Teacher - Access to assigned classes only
- Parent - Access to own children only
- Student - Access to own profile only
- Accountant - Finance module only

### Model: `Role` (Custom RBAC)
**Fields:**
- `name` - Dropdown: admin, teacher, parent, student, accountant
- `permissions` - JSON (list of permission codes)
- `tenant_id` - Hidden

---

## 📋 SUMMARY - Admin Form Types Used

| Input Type | Used For |
|------------|----------|
| **Text Input** | names, codes, emails, phone numbers |
| **Textarea** | descriptions, remarks, notes, message body |
| **Number Input** | credits, capacity, duration, marks |
| **Decimal Input** | amounts, percentages, scores |
| **Date Picker** | enrollment_date, exam_date, due_date, dob |
| **DateTime Picker** | created_at, updated_at, delivered_at |
| **Checkbox** | is_active, is_current, is_pass, is_delivered |
| **Dropdown (Select)** | status, gender, channel, template_type, risk_level |
| **Autocomplete (FK)** | student, class, section, exam, invoice, template |
| **JSON Editor** | variables, factors, recommendations, action_items |
| **Read-only** | percentage, grade, balance (auto-calculated) |

---

## 🎯 Admin Custom Actions

| Module | Custom Action | Description |
|--------|---------------|-------------|
| Students | Export CSV | Download student list |
| Attendance | Bulk Mark | Mark attendance for entire class |
| Exams | Publish Results | Send notifications to parents |
| Finance | Send Reminders | Trigger WhatsApp reminders |
| Admissions | Convert to Student | Create student from application |
| Communication | Test WhatsApp | Send test message to verify config |
| Analytics | Run Risk Assessment | Calculate risk for all students |

---

## 🔍 Admin List Display Features

- **Search Fields** - Text search on name, email, ID
- **Filters** - By status, date, class, is_active
- **Date Hierarchy** - Drill down by year/month/day
- **Actions** - Edit, Delete, View, Custom actions
- **Bulk Actions** - Delete selected, Update status, Export

---

This gives you a complete picture of what forms and options exist in your backend admin! 🚀