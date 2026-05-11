# Add to services/core/accounts/models.py
class TeacherProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='teacher_profile')
    employee_id = models.CharField(max_length=50, unique=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    qualification = models.CharField(max_length=200, blank=True)
    specialization = models.CharField(max_length=100, blank=True)
    assigned_classes = models.ManyToManyField('education_academics.SchoolClass', related_name='teachers', blank=True)
    assigned_sections = models.ManyToManyField('education_academics.Section', related_name='teachers', blank=True)
    assigned_subjects = models.ManyToManyField('education_academics.Subject', related_name='teachers', blank=True)
    is_active = models.BooleanField(default=True)
    hire_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email} - Teacher"
