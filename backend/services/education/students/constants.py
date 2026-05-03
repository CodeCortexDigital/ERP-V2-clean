# Student Status Choices
STUDENT_STATUS = [
    ('active', 'Active'),
    ('inactive', 'Inactive'),
    ('graduated', 'Graduated'),
    ('transferred', 'Transferred'),
    ('withdrawn', 'Withdrawn'),
    ('suspended', 'Suspended'),
    ('expelled', 'Expelled'),
    ('deferred', 'Deferred'),
    ('leave_of_absence', 'Leave of Absence'),
]

# Student Type Choices
STUDENT_TYPES = [
    ('full_time', 'Full Time'),
    ('part_time', 'Part Time'),
    ('evening', 'Evening'),
    ('online', 'Online'),
    ('exchange', 'Exchange'),
    ('visiting', 'Visiting'),
    ('non_matriculated', 'Non-Matriculated'),
    ('audit', 'Audit'),
]

# Gender Choices
GENDER_CHOICES = [
    ('M', 'Male'),
    ('F', 'Female'),
    ('O', 'Other'),
    ('N', 'Prefer not to say'),
]

# Enrollment Status
ENROLLMENT_STATUS = [
    ('enrolled', 'Enrolled'),
    ('completed', 'Completed'),
    ('dropped', 'Dropped'),
    ('withdrawn', 'Withdrawn'),
    ('failed', 'Failed'),
    ('in_progress', 'In Progress'),
    ('waitlisted', 'Waitlisted'),
]

# Document Types
DOCUMENT_TYPES = [
    ('id_card', 'ID Card'),
    ('passport', 'Passport'),
    ('visa', 'Visa'),
    ('photo', 'Photo'),
    ('birth_certificate', 'Birth Certificate'),
    ('transcript', 'Transcript'),
    ('diploma', 'Diploma'),
    ('enrollment_verification', 'Enrollment Verification'),
    ('financial_aid', 'Financial Aid Document'),
    ('health_record', 'Health Record'),
    ('insurance', 'Insurance Card'),
    ('other', 'Other'),
]

# Note Types
NOTE_TYPES = [
    ('general', 'General'),
    ('academic', 'Academic'),
    ('disciplinary', 'Disciplinary'),
    ('counseling', 'Counseling'),
    ('medical', 'Medical'),
    ('parent_contact', 'Parent Contact'),
    ('advisor_meeting', 'Advisor Meeting'),
    ('financial', 'Financial'),
    ('other', 'Other'),
]

# Guardian Relationship
GUARDIAN_RELATIONSHIP = [
    ('father', 'Father'),
    ('mother', 'Mother'),
    ('guardian', 'Legal Guardian'),
    ('spouse', 'Spouse'),
    ('sibling', 'Sibling'),
    ('grandparent', 'Grandparent'),
    ('aunt', 'Aunt'),
    ('uncle', 'Uncle'),
    ('other', 'Other'),
]

# Academic Record Types
ACADEMIC_RECORD_TYPES = [
    ('transcript', 'Transcript'),
    ('grade_sheet', 'Grade Sheet'),
    ('certificate', 'Certificate'),
    ('diploma', 'Diploma'),
    ('degree', 'Degree'),
    ('enrollment_verification', 'Enrollment Verification'),
    ('graduation_certificate', 'Graduation Certificate'),
    ('other', 'Other'),
]

# Blood Groups
BLOOD_GROUPS = [
    ('A+', 'A+'),
    ('A-', 'A-'),
    ('B+', 'B+'),
    ('B-', 'B-'),
    ('O+', 'O+'),
    ('O-', 'O-'),
    ('AB+', 'AB+'),
    ('AB-', 'AB-'),
    ('Unknown', 'Unknown'),
]

# Error Messages
ERROR_MESSAGES = {
    'duplicate_student': 'Student with this ID or email already exists.',
    'student_not_found': 'Student not found.',
    'invalid_status': 'Invalid status value.',
    'invalid_document_type': 'Invalid document type.',
    'document_not_found': 'Document not found.',
    'enrollment_exists': 'Student already enrolled in this course.',
    'program_not_found': 'Program not found.',
    'invalid_date_range': 'Invalid date range.',
    'file_too_large': 'File size exceeds maximum allowed.',
    'invalid_file_type': 'File type not allowed.',
}

# Success Messages
SUCCESS_MESSAGES = {
    'student_created': 'Student created successfully.',
    'student_updated': 'Student updated successfully.',
    'document_uploaded': 'Document uploaded successfully.',
    'document_verified': 'Document verified successfully.',
    'note_added': 'Note added successfully.',
    'enrollment_created': 'Enrollment created successfully.',
    'guardian_added': 'Guardian added successfully.',
}

# Cache Keys
CACHE_KEYS = {
    'student': 'student:{}',
    'student_list': 'student_list:{}',
    'program_students': 'program_students:{}',
    'enrollment_stats': 'enrollment_stats:{}',
}

# Pagination
PAGE_SIZES = [10, 25, 50, 100]
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 500

# File Upload
ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024  # 2MB

# Date Formats
DATE_FORMAT = '%Y-%m-%d'
DATETIME_FORMAT = '%Y-%m-%d %H:%M:%S'

# Student ID Prefix
STUDENT_ID_PREFIX = 'STU'
STUDENT_ID_LENGTH = 8