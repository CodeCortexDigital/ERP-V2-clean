from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Program, Course, AcademicYear
import uuid

class ProgramModelTest(TestCase):
    """Test the Program model"""
    
    def setUp(self):
        self.program = Program.objects.create(
            code="TEST-MODEL",
            name="Test Model Program",
            degree_type="bachelor",
            duration_years=4,
            total_credits=120
        )
    
    def test_program_creation(self):
        """Test that program is created correctly"""
        self.assertEqual(self.program.code, "TEST-MODEL")
        self.assertEqual(self.program.name, "Test Model Program")
        self.assertEqual(self.program.degree_type, "bachelor")
        self.assertTrue(self.program.is_active)
        self.assertIsInstance(self.program.id, uuid.UUID)
    
    def test_program_str_method(self):
        """Test the string representation"""
        self.assertEqual(str(self.program), "TEST-MODEL - Test Model Program")

class APITestCase(APITestCase):
    """Test the API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.program = Program.objects.create(
            code="API-TEST",
            name="API Test Program",
            degree_type="bachelor"
        )
    
    def test_get_programs_list(self):
        """Test GET /api/programs/"""
        response = self.client.get('/api/programs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_get_program_detail(self):
        """Test GET /api/programs/{id}/"""
        response = self.client.get(f'/api/programs/{self.program.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'API-TEST')
    
    def test_create_program(self):
        """Test POST /api/programs/"""
        data = {
            'code': 'NEW-TEST',
            'name': 'New Test Program',
            'degree_type': 'master',
            'duration_years': 2,
            'total_credits': 60
        }
        response = self.client.post('/api/programs/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Program.objects.count(), 2)