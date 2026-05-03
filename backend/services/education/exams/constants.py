# Exam Status Choices
EXAM_STATUS = [
    ('draft', 'Draft'),
    ('scheduled', 'Scheduled'),
    ('published', 'Published'),
    ('in_progress', 'In Progress'),
    ('completed', 'Completed'),
    ('grading', 'Grading'),
    ('results_published', 'Results Published'),
    ('cancelled', 'Cancelled'),
]

# Exam Format Choices
EXAM_FORMATS = [
    ('online', 'Online'),
    ('offline', 'Offline/Pen & Paper'),
    ('hybrid', 'Hybrid'),
    ('take_home', 'Take Home'),
]

# Registration Status
REGISTRATION_STATUS = [
    ('registered', 'Registered'),
    ('attended', 'Attended'),
    ('absent', 'Absent'),
    ('withdrawn', 'Withdrawn'),
    ('malpractice', 'Malpractice'),
]

# Grade Choices
GRADE_CHOICES = [
    ('A+', 'A+'), ('A', 'A'), ('A-', 'A-'),
    ('B+', 'B+'), ('B', 'B'), ('B-', 'B-'),
    ('C+', 'C+'), ('C', 'C'), ('C-', 'C-'),
    ('D', 'D'), ('F', 'F'),
]

# Malpractice Severity
MALPRACTICE_SEVERITY = [
    ('minor', 'Minor'),
    ('moderate', 'Moderate'),
    ('severe', 'Severe'),
    ('critical', 'Critical'),
]

# Malpractice Status
MALPRACTICE_STATUS = [
    ('reported', 'Reported'),
    ('investigating', 'Investigating'),
    ('proven', 'Proven'),
    ('dismissed', 'Dismissed'),
    ('action_taken', 'Action Taken'),
]

# Days of Week
DAYS_OF_WEEK = [
    ('monday', 'Monday'), ('tuesday', 'Tuesday'), ('wednesday', 'Wednesday'),
    ('thursday', 'Thursday'), ('friday', 'Friday'), ('saturday', 'Saturday'),
    ('sunday', 'Sunday'),
]

# Error Messages
ERROR_MESSAGES = {
    'duplicate_registration': 'Student already registered for this exam',
    'exam_not_found': 'Exam not found',
    'registration_not_found': 'Registration not found',
    'result_already_exists': 'Result already exists for this student',
    'exam_already_published': 'Exam results already published',
    'invalid_marks': 'Marks must be between 0 and total marks',
}

# Cache Keys
CACHE_KEYS = {
    'exam': 'exam:{}',
    'exam_list': 'exam_list:{}',
    'exam_stats': 'exam_stats:{}',
}

# File Upload
ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
]
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB