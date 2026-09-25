from django.urls import path

from . import api

urlpatterns = [
    path('settings/', api.library_settings, name='library-settings'),
    path('books/', api.books, name='library-books'),
    path('books/<str:book_id>/', api.book_detail, name='library-book'),
    path('books/<str:book_id>/copies/', api.add_copies, name='library-add-copies'),
    path('copies/<str:copy_id>/', api.copy_detail, name='library-copy'),
    path('labels/', api.labels, name='library-labels'),
    path('members/', api.members, name='library-members'),
    path('members/<str:member_id>/', api.member_detail, name='library-member'),
    path('issue/', api.issue, name='library-issue'),
    path('return/', api.return_book, name='library-return'),
    path('loans/', api.loans, name='library-loans'),
    path('loans/<str:loan_id>/renew/', api.renew, name='library-renew'),
    path('loans/<str:loan_id>/<str:action>/', api.loan_action, name='library-loan-action'),
    path('reservations/', api.reservations, name='library-reservations'),
    path('reservations/<str:reservation_id>/cancel/', api.cancel_reservation, name='library-reservation-cancel'),
    path('mine/', api.mine, name='library-mine'),
    path('report/', api.report, name='library-report'),
]
