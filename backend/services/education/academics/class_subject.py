class ClassSubject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school_class = models.ForeignKey('SchoolClass', on_delete=models.CASCADE, related_name='assigned_subjects')
    course = models.ForeignKey('Course', on_delete=models.CASCADE, related_name='assigned_classes')
    teacher_name = models.CharField(max_length=200, blank=True)
    teacher_email = models.EmailField(blank=True)
    is_core = models.BooleanField(default=True)
    exam_weightage = models.IntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['school_class', 'course']
