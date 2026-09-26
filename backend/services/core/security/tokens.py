"""Token refresh that honours "sign out everywhere" and switched-off accounts."""
from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from services.core.tenants.authentication import SIGNED_OUT, issued_before_sign_out


class SafeTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs['refresh'])
        user = get_user_model().objects.filter(**{api_settings.USER_ID_FIELD: refresh.get(api_settings.USER_ID_CLAIM)}).first()
        if user is None or not user.is_active or issued_before_sign_out(user, refresh):
            raise AuthenticationFailed(SIGNED_OUT, code='signed_out')
        return super().validate(attrs)


class SafeTokenRefreshView(TokenRefreshView):
    serializer_class = SafeTokenRefreshSerializer
