from rest_framework import generics
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
from .permissions import HasModulePermission

User = get_user_model()

class UserCreateView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [HasModulePermission]

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [HasModulePermission]


# Tenants API
from rest_framework.views import APIView
from rest_framework.response import Response

class TenantListView(APIView):
    def get(self, request):
        return Response({
            "count": 1,
            "results": [
                {
                    "id": 1,
                    "name": "Default Tenant",
                    "schema_name": "public",
                    "domain": "localhost"
                }
            ]
        })

