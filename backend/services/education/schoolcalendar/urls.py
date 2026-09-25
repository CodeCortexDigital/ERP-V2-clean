from django.urls import path

from . import api

urlpatterns = [
    path('feed/', api.feed, name='calendar-feed'),
    path('feed-link/', api.feed_link, name='calendar-feed-link'),
    path('ical/<str:token>/', api.ical, name='calendar-ical'),
    path('events/', api.events, name='calendar-events'),
    path('events/<str:event_id>/', api.event_detail, name='calendar-event'),
    path('meetings/', api.meetings, name='calendar-meetings'),
    path('meetings/children/', api.my_children, name='calendar-my-children'),
    path('meetings/<str:slot_id>/book/', api.book_meeting, name='calendar-meeting-book'),
    path('meetings/<str:slot_id>/cancel/', api.cancel_meeting, name='calendar-meeting-cancel'),
]
