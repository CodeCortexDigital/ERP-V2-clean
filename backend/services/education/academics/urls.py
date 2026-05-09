from django.urls import path
from . import views

urlpatterns = [
    # LEVEL 1: BASIC STRUCTURE
    path('academic-years/', views.AcademicYearListCreateView.as_view(), name='academic-year-list'),
    path('classes/', views.SchoolClassListCreateView.as_view(), name='class-list'),
    path('classes/<str:id>/', views.SchoolClassDetailView.as_view(), name='class-detail'),
    path('classes/<str:class_id>/sections/', views.ClassSectionsView.as_view(), name='class-sections'),
    path('sections/', views.SectionListCreateView.as_view(), name='section-list'),
    path('subjects/', views.SubjectListCreateView.as_view(), name='subject-list'),
    path('subjects/<str:id>/', views.SubjectDetailView.as_view(), name='subject-detail'),
    path('class-subjects/', views.ClassSubjectListCreateView.as_view(), name='class-subject-list'),
    path('class-subjects/<str:id>/', views.ClassSubjectDetailView.as_view(), name='class-subject-detail'),
    
    # LEVEL 2: ASSESSMENT & GRADING
    path('grade-scales/', views.GradeScaleListCreateView.as_view(), name='grade-scale-list'),
    path('grade-scales/<str:id>/', views.GradeScaleDetailView.as_view(), name='grade-scale-detail'),
    path('assessment-types/', views.AssessmentTypeListCreateView.as_view(), name='assessment-type-list'),
    path('assessment-types/<str:id>/', views.AssessmentTypeDetailView.as_view(), name='assessment-type-detail'),
    path('assessment-weightages/', views.AssessmentWeightageListCreateView.as_view(), name='assessment-weightage-list'),
    path('assessment-weightages/<str:id>/', views.AssessmentWeightageDetailView.as_view(), name='assessment-weightage-detail'),
    
    # LEVEL 3: SYLLABUS & RESOURCES
    path('syllabi/', views.SyllabusListCreateView.as_view(), name='syllabus-list'),
    path('syllabi/<str:id>/', views.SyllabusDetailView.as_view(), name='syllabus-detail'),
    path('syllabus-units/', views.SyllabusUnitListCreateView.as_view(), name='syllabus-unit-list'),
    path('syllabus-units/<str:id>/', views.SyllabusUnitDetailView.as_view(), name='syllabus-unit-detail'),
    path('syllabus-topics/', views.SyllabusTopicListCreateView.as_view(), name='syllabus-topic-list'),
    path('syllabus-topics/<str:id>/', views.SyllabusTopicDetailView.as_view(), name='syllabus-topic-detail'),
    path('syllabus-subtopics/', views.SyllabusSubTopicListCreateView.as_view(), name='syllabus-subtopic-list'),
    path('syllabus-subtopics/<str:id>/', views.SyllabusSubTopicDetailView.as_view(), name='syllabus-subtopic-detail'),
    path('learning-resources/', views.LearningResourceListCreateView.as_view(), name='learning-resource-list'),
    path('learning-resources/<str:id>/', views.LearningResourceDetailView.as_view(), name='learning-resource-detail'),
    
    # LEVEL 4: TEACHER MANAGEMENT
    path('teachers/', views.TeacherListCreateView.as_view(), name='teacher-list'),
    path('teachers/<str:id>/', views.TeacherDetailView.as_view(), name='teacher-detail'),
    path('teacher-assignments/', views.TeacherSubjectAssignmentListCreateView.as_view(), name='teacher-assignment-list'),
    path('teacher-assignments/<str:id>/', views.TeacherSubjectAssignmentDetailView.as_view(), name='teacher-assignment-detail'),
    path('teacher-availability/', views.TeacherAvailabilityListCreateView.as_view(), name='teacher-availability-list'),
    path('teacher-availability/<str:id>/', views.TeacherAvailabilityDetailView.as_view(), name='teacher-availability-detail'),
    
    # LEVEL 5: SCHEDULING & TIMETABLE
    path('periods/', views.PeriodListCreateView.as_view(), name='period-list'),
    path('periods/<str:id>/', views.PeriodDetailView.as_view(), name='period-detail'),
    path('classrooms/', views.ClassroomListCreateView.as_view(), name='classroom-list'),
    path('classrooms/<str:id>/', views.ClassroomDetailView.as_view(), name='classroom-detail'),
    path('timetable-entries/', views.TimetableEntryListCreateView.as_view(), name='timetable-entry-list'),
    path('timetable-entries/<str:id>/', views.TimetableEntryDetailView.as_view(), name='timetable-entry-detail'),
    
    # LEVEL 6: PROGRESS TRACKING
    path('lesson-plans/', views.LessonPlanListCreateView.as_view(), name='lesson-plan-list'),
    path('lesson-plans/<str:id>/', views.LessonPlanDetailView.as_view(), name='lesson-plan-detail'),
    path('topic-coverage/', views.TopicCoverageListCreateView.as_view(), name='topic-coverage-list'),
    path('topic-coverage/<str:id>/', views.TopicCoverageDetailView.as_view(), name='topic-coverage-detail'),
    path('student-topic-progress/', views.StudentTopicProgressListCreateView.as_view(), name='student-topic-progress-list'),
    path('student-topic-progress/<str:id>/', views.StudentTopicProgressDetailView.as_view(), name='student-topic-progress-detail'),
    path('teacher-feedback/', views.TeacherFeedbackListCreateView.as_view(), name='teacher-feedback-list'),
    path('teacher-feedback/<str:id>/', views.TeacherFeedbackDetailView.as_view(), name='teacher-feedback-detail'),
]
