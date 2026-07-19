from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from .models import AuditLog
from django.shortcuts import get_object_or_404


class GDPRExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        User = get_user_model()
        user = get_object_or_404(User, pk=user_id)
        # Only allow user to export their own data or admin
        if request.user != user and not request.user.is_staff:
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


class AnonymizeUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        User = get_user_model()
        user = get_object_or_404(User, pk=user_id)
        # Allow user to anonymize themselves or staff
        if request.user != user and not request.user.is_staff:
            return Response({'detail': 'Forbidden'}, status=403)

        # Basic anonymization
        user.email = f'anonymized+{user.pk}@example.invalid'
        if hasattr(user, 'phone'):
            try:
                setattr(user, 'phone', '')
            except Exception:
                pass
        user.is_active = False
        user.save()

        AuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            resource_type='core.user.anonymize',
            resource_id=user.pk,
            old_data=None,
            new_data={'anonymized': True},
        )

        return Response({'status': 'anonymized'})


class AuditLogListView(APIView):
    """List audit log entries (admin only). Supports filtering by
    resource_type and action, and basic search by actor email/name."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from .models import AuditLog
        from django.db.models import Q

        qs = AuditLog.objects.select_related('user').all()

        resource_type = request.query_params.get('resource_type')
        if resource_type:
            qs = qs.filter(resource_type=resource_type)

        action = request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        q = request.query_params.get('q')
        if q:
            qs = qs.filter(
                Q(user__email__icontains=q) | Q(user__username__icontains=q)
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
