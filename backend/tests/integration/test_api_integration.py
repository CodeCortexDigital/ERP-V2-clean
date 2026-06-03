"""Minimal integration tests for backend API endpoints."""
import pytest
from rest_framework import status
from tests.conftest import UserFactory

pytestmark = pytest.mark.django_db


def test_live_health_endpoint(api_client):
    """The live health endpoint should respond successfully."""
    response = api_client.get('/api/v1/health/live/')

    assert response.status_code == status.HTTP_200_OK
    assert response.data.get('status') == 'alive'


def test_login_and_current_user_flow(api_client):
    """Test login and authenticated current user retrieval."""
    user = UserFactory(email='integration@example.com', password='Integration123!')

    login_response = api_client.post(
        '/api/v1/auth/login/',
        {
            'user_id': user.email,
            'password': 'Integration123!',
        },
        format='json'
    )

    assert login_response.status_code == status.HTTP_200_OK
    assert 'access' in login_response.data
    assert 'refresh' in login_response.data

    access_token = login_response.data['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    profile_response = api_client.get('/api/v1/auth/me/')
    assert profile_response.status_code == status.HTTP_200_OK
    assert profile_response.data.get('email') == user.email
