"""Keep gradebook scores in step with exam marks entered in the exams module."""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from services.education.exams.models import ExamResult

from .models import Assignment, Score


@receiver(post_save, sender=ExamResult)
def exam_mark_to_gradebook(sender, instance, raw=False, **kwargs):
    if raw:
        return
    assignment = Assignment.objects.filter(exam_id=instance.exam_id).first()
    if assignment is None:
        return
    Score.objects.update_or_create(
        assignment=assignment, student_id=instance.student_id,
        defaults={'points': instance.obtained_marks, 'status': 'graded'},
    )


@receiver(post_delete, sender=ExamResult)
def exam_mark_removed(sender, instance, **kwargs):
    Score.objects.filter(assignment__exam_id=instance.exam_id, student_id=instance.student_id).delete()
