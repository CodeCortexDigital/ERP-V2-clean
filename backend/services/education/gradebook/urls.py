from django.urls import path

from . import api

urlpatterns = [
    path('scales/', api.scales, name='gradebook-scales'),
    path('scales/<str:scale_id>/', api.scale_detail, name='gradebook-scale-detail'),
    path('classes/', api.my_classes, name='gradebook-classes'),
    path('grid/', api.grid, name='gradebook-grid'),
    path('categories/', api.categories, name='gradebook-categories'),
    path('categories/<str:category_id>/', api.category_detail, name='gradebook-category-detail'),
    path('assignments/', api.assignments, name='gradebook-assignments'),
    path('assignments/from-exam/', api.assignment_from_exam, name='gradebook-assignment-from-exam'),
    path('assignments/<str:assignment_id>/', api.assignment_detail, name='gradebook-assignment-detail'),
    path('scores/', api.save_scores, name='gradebook-scores'),
    path('standards/', api.standards, name='gradebook-standards'),
    path('standards/<str:standard_id>/', api.standard_detail, name='gradebook-standard-detail'),
    path('standard-ratings/', api.standard_ratings, name='gradebook-standard-ratings'),
    path('comments/', api.comment, name='gradebook-comments'),
    path('releases/', api.releases, name='gradebook-releases'),
    path('releases/<str:release_id>/', api.release_detail, name='gradebook-release-detail'),
    path('report-card/<str:student_id>/', api.report_card, name='gradebook-report-card'),
    path('transcript/<str:student_id>/', api.transcript, name='gradebook-transcript'),
    path('students/<str:student_id>/grades/', api.student_grades, name='gradebook-student-grades'),
]
