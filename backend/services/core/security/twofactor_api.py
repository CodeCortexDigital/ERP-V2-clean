"""Two-step sign-in, for the signed-in person (P8)."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.audit.models import AuditLog

from . import policy, twofactor


def _log(request, what):
    AuditLog.objects.create(user=request.user, school=policy.user_school(request.user), action='SECURITY',
                            resource_type=f'v1/security/2fa/{what}/', new_data={'two_step': what},
                            ip_address=policy.client_ip(request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def two_factor_status(request):
    return Response(twofactor.status(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def two_factor_setup(request):
    if twofactor.enabled(request.user):
        return Response({'error': 'Two-step sign-in is already on. Turn it off first to move it to another phone.'},
                        status=status.HTTP_400_BAD_REQUEST)
    return Response(twofactor.start_setup(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def two_factor_confirm(request):
    codes = twofactor.confirm(request.user, request.data.get('code'))
    if codes is None:
        return Response({'error': 'That code is not right. Check the time on your phone and try the newest code.'},
                        status=status.HTTP_400_BAD_REQUEST)
    _log(request, 'on')
    return Response({'recovery_codes': codes, **twofactor.status(request.user)})


def _proves_it(request) -> bool:
    user = request.user
    return user.check_password(str(request.data.get('password') or '')) and bool(twofactor.verify(user, request.data.get('code')))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def two_factor_disable(request):
    if twofactor.required_for(request.user):
        return Response({'error': 'Two-step sign-in is required for your account, so it can\'t be turned off.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if not _proves_it(request):
        return Response({'error': 'Enter your password and a current code (or a recovery code).'}, status=status.HTTP_400_BAD_REQUEST)
    twofactor.turn_off(request.user)
    _log(request, 'off')
    return Response(twofactor.status(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def two_factor_recovery_codes(request):
    if not twofactor.enabled(request.user) or not _proves_it(request):
        return Response({'error': 'Enter your password and a current code.'}, status=status.HTTP_400_BAD_REQUEST)
    _log(request, 'new-recovery-codes')
    return Response({'recovery_codes': twofactor.new_recovery_codes(request.user), **twofactor.status(request.user)})
