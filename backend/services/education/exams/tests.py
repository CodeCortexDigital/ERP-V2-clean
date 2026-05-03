from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import ExamType, Exam
from datetime import date, time
import uuid

class ExamTypeModelTest(TestCase):
    """Test the ExamType model"""
    
    def setUp(self):
        self.exam_type = ExamType.objects.create(
            name="Midterm Examination",
            code="MID",
            description="Midterm exam",
            weight_percentage=30.00
        )
    
    def test_exam_type_creation(self):
        self.assertEqual(self.exam_type.name, "Midterm Examination")
        self.assertEqual(self.exam_type.code, "MID")
        self.assertEqual(self.exam_type.weight_percentage, 30.00)

class ExamAPITest(APITestCase):
    """Test the Exam API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.exam_type = ExamType.objects.create(
            name="Final Examination",
            code="FINAL",
            weight_percentage=50.00
        )
        
        self.exam = Exam.objects.create(
            title="CS101 Final Exam",
            code="CS101-FINAL-2024",
            exam_type=self.exam_type,
            course_id=uuid.uuid4(),
            course_code="CS101",
            course_name="Programming",
            exam_date=date(2024, 12, 15),
            start_time=time(9, 0),
            end_time=time(12, 0),
            duration_minutes=180,
            total_marks=100,
            passing_marks=40,
            status="scheduled"
        )
    
    def test_list_exams(self):
        """Test GET /api/v1/exams/"""
        url = '/api/v1/exams/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_create_exam(self):
        """Test POST /api/v1/exams/"""
        url = '/api/v1/exams/'
        data = {
            'title': 'Test Exam',
            'code': 'TEST-101',
            'exam_type': str(self.exam_type.id),
            'course_id': str(uuid.uuid4()),
            'course_code': 'TEST101',
            'course_name': 'Test Course',
            'exam_date': '2024-12-20',
            'start_time': '10:00:00',
            'end_time': '12:00:00',
            'duration_minutes': 120,
            'total_marks': 100,
            'passing_marks': 40,
            'status': 'draft'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Exam.objects.count(), 2)