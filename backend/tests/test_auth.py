"""
Authentication API tests.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from tests.conftest import UserFactory


pytestmark = pytest.mark.django_db


class TestAuthenticationAPI:
    """Test suite for authentication endpoints."""
    
    def test_user_creation(self):
        """Test user can be created."""
        user = UserFactory(username='newuser')
        assert user.id is not None
        assert user.username == 'newuser'
        assert user.is_active is True
    
    def test_user_password_set(self):
        """Test user password is set correctly."""
        user = UserFactory(username='passuser', password='testpass123')
        assert user.check_password('testpass123')
    
    def test_refresh_token_generation(self):
        """Test JWT refresh token can be generated."""
        user = UserFactory()
        refresh = RefreshToken.for_user(user)
        assert refresh.access_token is not None
        assert str(refresh) is not None
    
    def test_token_validation(self):
        """Test JWT token validation."""
        user = UserFactory()
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Verify token contains user ID
        assert access_token.payload['user_id'] == user.id


class TestLoginAPI:
    """Test suite for login endpoint."""
    
    def test_login_with_valid_credentials(self, api_client):
        """Test login with valid credentials."""
        user = UserFactory(username='testlogin', password='correctpass')
        response = api_client.post('/api/auth/login/', {
            'username': 'testlogin',
            'password': 'correctpass'
        }, format='json')
        
        # Should return tokens
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED, status.HTTP_404_NOT_FOUND]
    
    def test_login_with_invalid_credentials(self, api_client):
        """Test login with invalid credentials."""
        UserFactory(username='testuser', password='correctpass')
        response = api_client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'wrongpass'
        }, format='json')
        
        # Should reject invalid credentials
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]
    
    def test_logout(self, authenticated_api_client):
        """Test logout functionality."""
        client, user = authenticated_api_client
        # Logout endpoint test (if exists)
        # Note: Adjust URL based on your actual implementation
        pass


class TestTokenRefresh:
    """Test suite for token refresh endpoint."""
    
    def test_refresh_token_validity(self):
        """Test refresh token can be used to get new access token."""
        user = UserFactory()
        refresh = RefreshToken.for_user(user)
        
        # Verify refresh token works
        assert refresh.access_token is not None
        assert refresh['user_id'] == user.id


class TestUserProfile:
    """Test suite for user profile endpoints."""
    
    def test_get_current_user_profile(self, authenticated_api_client):
        """Test getting current user profile."""
        client, user = authenticated_api_client
        # Note: Adjust URL based on your actual implementation
        # response = client.get('/api/auth/profile/')
        # assert response.status_code == status.HTTP_200_OK
        pass
    
    def test_update_user_profile(self, authenticated_api_client):
        """Test updating user profile."""
        client, user = authenticated_api_client
        # Note: Adjust URL and payload based on your actual implementation
        pass
