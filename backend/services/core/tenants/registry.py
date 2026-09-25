"""Which models belong to a school, and how to reach that school from a row.

Every model listed here is filtered to the current school automatically
(see scoping.install()). Models with their own ``tenant`` column use
'tenant'; child rows reach it through a required parent, e.g. a Payment
through its Invoice and Student.
"""

# Models that carry their own ``tenant`` FK to core_tenants.School.
DIRECT = [
    'education_students.Student',
    'education_students.Certificate',
    'education_students.Household',
    'education_students.Guardian',
    'education_students.StudentGuardian',
    'education_students.StudentHealth',
    'education_students.Immunization',
    'education_students.Enrollment',
    'education_academics.SchoolClass',
    'education_academics.Section',
    'education_academics.Teacher',
    'education_academics.AcademicYear',
    'education_academics.Term',
    'education_academics.Subject',
    'education_academics.GradeScale',
    'education_academics.AssessmentType',
    'education_academics.Classroom',
    'education_academics.TeacherLeave',
    'education_academics.LeaveBalance',
    'education_academics.Homework',
    'education_academics.LiveMeeting',
    'education_attendance.AttendanceRecord',
    'education_attendance.StudentFaceEncoding',
    'education_attendance.PeriodAttendance',
    'education_attendance.AbsenceReport',
    'education_attendance.AttendanceNotice',
    'education_exams.Exam',
    'education_exams.ExamResult',
    'education_finance.PaymentGatewayConfig',
    'education_finance.InstallmentPlan',
    'education_finance.Scholarship',
    'education_finance.LateFeeRule',
    'education_finance.TransactionLog',
    'education_finance.FinanceSettings',
    'education_finance.AccountHead',
    'education_finance.LedgerEntry',
    'education_finance.WeekdayConfig',
    'education_finance.AccountCredit',
    'education_admissions.Applicant',
    'education_admissions.ReEnrollmentCampaign',
    'education_communication.Message',
    'education_communication.Notification',
    'education_communication.MessageTemplate',
    'education_communication.AutoTrigger',
    'education_communication.WhatsAppConfig',
    'education_gradebook.GradingScale',
    'education_gradebook.Category',
    'education_gradebook.Standard',
    'education_gradebook.Assignment',
    'education_gradebook.StandardRating',
    'education_gradebook.ReportComment',
    'education_gradebook.ReportCardRelease',
    'ai.AIConversation',
    'ai.AIUsage',
]

# Models without their own column: path to the school through a required parent.
THROUGH_PARENT = {
    'education_academics.ClassSubject': 'class_ref__tenant',
    'education_academics.AssessmentWeightage': 'class_subject__class_ref__tenant',
    'education_academics.Syllabus': 'class_subject__class_ref__tenant',
    'education_academics.SyllabusUnit': 'syllabus__class_subject__class_ref__tenant',
    'education_academics.SyllabusTopic': 'unit__syllabus__class_subject__class_ref__tenant',
    'education_academics.SyllabusSubTopic': 'topic__unit__syllabus__class_subject__class_ref__tenant',
    'education_academics.LearningResource': 'syllabus__class_subject__class_ref__tenant',
    'education_academics.TeacherSubjectAssignment': 'teacher__tenant',
    'education_academics.TeacherAvailability': 'teacher__tenant',
    'education_academics.Period': 'academic_year__tenant',
    'education_academics.TimetableEntry': 'teacher__tenant',
    'education_academics.TimetableSubstitution': 'relief_teacher__tenant',
    'education_academics.HomeworkSubmission': 'homework__tenant',
    'education_academics.LessonPlan': 'teacher__tenant',
    'education_academics.TopicCoverage': 'teacher__tenant',
    'education_academics.StudentTopicProgress': 'student__tenant',
    'education_academics.TeacherFeedback': 'teacher__tenant',
    'education_academics.TeacherDailyAvailability': 'teacher__tenant',
    'education_academics.TeacherAttendance': 'teacher__tenant',
    'education_academics.SectionTeacherAssignment': 'teacher__tenant',
    'education_attendance.AttendanceAnalytics': 'student__tenant',
    'education_attendance.AttendancePattern': 'student__tenant',
    'education_attendance.AttendanceAlert': 'student__tenant',
    'education_exams.Quiz': 'subject__tenant',
    'education_exams.QuizQuestion': 'quiz__subject__tenant',
    'education_exams.ExamSchedule': 'exam__tenant',
    'education_exams.ExamRegistration': 'exam__tenant',
    'education_finance.FeeStructure': 'class_ref__tenant',
    'education_finance.Invoice': 'student__tenant',
    'education_finance.Payment': 'invoice__student__tenant',
    'education_finance.PaymentTransaction': 'invoice__student__tenant',
    'education_finance.StudentScholarship': 'student__tenant',
    'education_finance.Payslip': 'employee__tenant',
    'education_finance.EmployeeCredit': 'employee__tenant',
    'education_finance.Refund': 'payment__invoice__student__tenant',
    'education_admissions.Application': 'applicant__tenant',
    'education_admissions.ApplicationDocument': 'application__applicant__tenant',
    'education_admissions.ApplicationEvent': 'application__applicant__tenant',
    'education_admissions.ReEnrollmentResponse': 'campaign__tenant',
    'analytics.StudentRisk': 'student__tenant',
    'analytics.AcademicPrediction': 'student__tenant',
    'analytics.Recommendation': 'student__tenant',
    'ai.AIMessage': 'conversation__tenant',
    'education_gradebook.GradeBand': 'scale__tenant',
    'education_gradebook.Score': 'assignment__tenant',
}

# Codes that must be unique within a school (not across all schools).
UNIQUE_PER_SCHOOL = {
    'education_academics.Subject': 'code',
    'education_academics.AssessmentType': 'code',
    'education_academics.Classroom': 'code',
    'education_finance.AccountHead': 'code',
    'education_finance.WeekdayConfig': 'day_code',
}


def tenant_paths():
    """{model label: lookup path to School}."""
    paths = {label: 'tenant' for label in DIRECT}
    paths.update(THROUGH_PARENT)
    return paths
