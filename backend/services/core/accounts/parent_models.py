# Add to services/core/accounts/models.py
class ParentProfile(models.Model):
    RELATIONSHIP_TYPES = [
        ('father', 'Father'),
        ('mother', 'Mother'),
        ('guardian', 'Guardian'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='parent_profile')
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    relationship_type = models.CharField(max_length=20, choices=RELATIONSHIP_TYPES, default='guardian')
    linked_students = models.ManyToManyField('education_students.Student', related_name='parents', blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email} - Parent"
