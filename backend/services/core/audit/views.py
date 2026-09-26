from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from services.core.accounts.permissions import IsSchoolAdmin
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from .models import AuditLog
from django.shortcuts import get_object_or_404


class GDPRExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        User = get_user_model()
        user = get_object_or_404(User, pk=user_id)
        # Only your own data (the platform owner may export anyone's).
        if request.user != user and not request.user.is_superuser:
            return Response({'detail': 'Forbidden'}, status=403)

        # Collect user basics and audit logs
        audit_entries = AuditLog.objects.filter(user=user).order_by('-timestamp')[:1000]
        return Response({
            'user': {
                'id': str(user.pk),
                'email': getattr(user, 'email', None),
                'full_name': getattr(user, 'get_full_name', lambda: None)(),
            },
            'audit_logs': [
                {
                    'action': a.action,
                    'resource': a.resource_type,
                    'resource_id': str(a.resource_id) if a.resource_id else None,
                    'timestamp': a.timestamp,
                    'old_data': a.old_data,
                    'new_data': a.new_data,
                }
                for a in audit_entries
            ]
        })


class AuditLogListView(APIView):
    """List audit log entries of the admin's own school (the platform owner sees all). Supports filtering by
    resource_type and action, and basic search by actor email/name."""
    permission_classes = [IsSchoolAdmin]

    def get(self, request):
        from .models import AuditLog
        from django.db.models import Q

        qs = AuditLog.objects.select_related('user').all()
        if not request.user.is_superuser:
            qs = qs.filter(school=getattr(request, 'tenant', None)) if getattr(request, 'tenant', None) else qs.none()

        resource_type = request.query_params.get('resource_type')
        if resource_type:
            qs = qs.filter(resource_type=resource_type)

        action = request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        q = request.query_params.get('q')
        if q:
            qs = qs.filter(
                Q(user__email__icontains=q) | Q(user__full_name__icontains=q)
            )

        qs = qs.order_by('-timestamp')[:500]

        data = [
            {
                'id': str(a.id),
                'user': a.user.get_username() if a.user else None,
                'user_id': str(a.user_id) if a.user_id else None,
                'action': a.action,
                'resource_type': a.resource_type,
                'resource_id': str(a.resource_id) if a.resource_id else None,
                'old_data': a.old_data,
                'new_data': a.new_data,
                'changes': a.changes,
                'timestamp': a.timestamp,
            }
            for a in qs
        ]
        return Response({'results': data, 'count': len(data)})
