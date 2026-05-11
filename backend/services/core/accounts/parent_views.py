# Add to services/core/accounts/views.py (at the end of the file)

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import ParentProfile
from .permissions import IsParent

class ParentDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsParent]
    
    def get(self, request):
        parent = request.user.parent_profile
        students = parent.linked_students.all()
        
        data = {
            'parent_name': request.user.get_full_name() or request.user.email,
            'children_count': students.count(),
            'students': [
                {
                    'id': str(s.id),
                    'name': s.full_name,
                    'class': s.current_class.name if s.current_class else None,
                    'attendance_percentage': 85,
                    'fee_status': 'paid'
                }
                for s in students
            ]
        }
        return Response(data)
