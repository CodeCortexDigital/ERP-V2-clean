from django.contrib.auth import get_user_model

from .models import Notification

User = get_user_model()


def create_user_notification(recipient, title: str, message: str, notification_type: str = 'system'):
    if not recipient:
        return None

    try:
        return Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
        )
    except Exception:
        return None


def get_user_by_email(email: str):
    if not email:
        return None
    return User.objects.filter(email__iexact=email).first()


def get_user_by_id(user_id):
    if not user_id:
        return None
    return User.objects.filter(id=user_id).first()


def create_user_notifications_for_student_and_parents(student, title: str, message: str, notification_type: str = 'system'):
    created = []

    student_user = get_user_by_email(getattr(student, 'email', None))
    if student_user:
        notification = create_user_notification(student_user, title, message, notification_type)
        if notification:
            created.append(notification)

    parent_profiles = getattr(student, 'parents', None)
    if parent_profiles is not None:
        for parent_profile in parent_profiles.all():
            parent_user = getattr(parent_profile, 'user', None)
            if parent_user:
                notification = create_user_notification(parent_user, title, message, notification_type)
                if notification:
                    created.append(notification)

    return created
