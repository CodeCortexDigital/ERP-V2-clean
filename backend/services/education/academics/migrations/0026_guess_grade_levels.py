"""Fill in grade levels from class names ("Grade 5", "Class 3", "Year 10", "KG", "Nursery")."""
import re

from django.db import migrations


def guess_grade(name: str):
    n = (name or '').lower()
    if re.search(r'\b(pre[\s-]?k|nursery|playgroup|play group|montessori|prep)\b', n):
        return -1
    if re.search(r'\b(kg|k\.g\.|kindergarten|kinder|reception)\b', n):
        return 0
    m = re.search(r'(\d{1,2})', n)
    if m and 1 <= int(m.group(1)) <= 12:
        return int(m.group(1))
    words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
    for i, w in enumerate(words, start=1):
        if re.search(rf'\b{w}\b', n):
            return i
    return None


def fill(apps, schema_editor):
    SchoolClass = apps.get_model('education_academics', 'SchoolClass')
    for cls in SchoolClass.objects.filter(grade_level__isnull=True):
        level = guess_grade(cls.name)
        if level is not None:
            SchoolClass.objects.filter(pk=cls.pk).update(grade_level=level)


class Migration(migrations.Migration):
    dependencies = [('education_academics', '0025_schoolclass_grade_level_schoolclass_homeroom_teacher_and_more')]
    operations = [migrations.RunPython(fill, migrations.RunPython.noop)]
