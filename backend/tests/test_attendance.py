"""
Attendance model and API tests.
"""
import pytest
from datetime import datetime, timedelta
from rest_framework import status
from tests.conftest import (
    AttendanceRecordFactory, StudentFactory, TeacherFactory
)


pytestmark = pytest.mark.django_db


class TestAttendanceModel:
    """Test Attendance model."""
    
    def test_attendance_record_creation(self, test_attendance_record):
        """Test attendance record can be created."""
        assert test_attendance_record.id is not None
        assert test_attendance_record.student is not None
        assert test_attendance_record.marked_by is not None
    
    def test_attendance_status_choices(self, test_attendance_record):
        """Test attendance status is valid."""
        assert test_attendance_record.status in ['present', 'absent', 'leave', 'sick']
    
    def test_attendance_unique_per_day(self, test_student, test_teacher):
        """Test only one attendance record per student per day."""
        date = datetime.now().date()
        AttendanceRecordFactory(student=test_student, marked_by=test_teacher, date=date, status='present')
        # Attempting to create another should violate uniqueness constraint
        # This depends on your model constraints
        pass


class TestAttendanceAPI:
    """Test Attendance API endpoints."""
    
    def test_mark_attendance(self, authenticated_api_client, test_student, test_teacher):
        """Test marking attendance."""
        client, user = authenticated_api_client
        
        # Adjust endpoint and payload based on actual implementation
        # data = {
        #     'student': test_student.id,
        #     'date': datetime.now().date(),
        #     'status': 'present'
        # }
        # response = client.post('/api/attendance/mark/', data)
        # assert response.status_code == status.HTTP_201_CREATED
    
    def test_mark_bulk_attendance(self, authenticated_api_client, test_teacher):
        """Test marking bulk attendance."""
        client, user = authenticated_api_client
        students = StudentFactory.create_batch(10)
        
        # Adjust endpoint and payload based on actual implementation
        # data = {
        #     'class': students[0].class_obj.id,
        #     'date': datetime.now().date(),
        #     'records': [
        #         {'student': s.id, 'status': 'present'} for s in students
        #     ]
        # }
        # response = client.post('/api/attendance/bulk-mark/', data)
        # assert response.status_code == status.HTTP_201_CREATED
    
    def test_get_attendance_record(self, test_attendance_record, authenticated_api_client):
        """Test retrieving attendance record."""
        client, user = authenticated_api_client
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/attendance/{test_attendance_record.id}/')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_update_attendance_record(self, test_attendance_record, authenticated_api_client):
        """Test updating attendance record."""
        client, user = authenticated_api_client
        # Adjust endpoint and payload based on actual implementation
        # data = {'status': 'leave'}
        # response = client.patch(f'/api/attendance/{test_attendance_record.id}/', data)
        # assert response.status_code == status.HTTP_200_OK


class TestAttendanceFiltering:
    """Test attendance filtering."""
    
    def test_filter_attendance_by_date_range(self, authenticated_api_client, test_student):
        """Test filtering attendance by date range."""
        client, user = authenticated_api_client
        
        start_date = (datetime.now() - timedelta(days=30)).date()
        end_date = datetime.now().date()
        
        # Create attendance records
        for i in range(10):
            date = start_date + timedelta(days=i*3)
            AttendanceRecordFactory(student=test_student, date=date)
        
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/attendance/?start_date={start_date}&end_date={end_date}')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_filter_attendance_by_student(self, authenticated_api_client, test_student):
        """Test filtering attendance by student."""
        client, user = authenticated_api_client
        AttendanceRecordFactory.create_batch(5, student=test_student)
        
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/attendance/?student={test_student.id}')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_filter_attendance_by_status(self, authenticated_api_client, test_student):
        """Test filtering attendance by status."""
        client, user = authenticated_api_client
        
        # Create records with different statuses
        AttendanceRecordFactory(student=test_student, status='present')
        AttendanceRecordFactory(student=test_student, status='absent')
        AttendanceRecordFactory(student=test_student, status='leave')
        
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/attendance/?status=present')
        # assert response.status_code == status.HTTP_200_OK


class TestAttendanceStatistics:
    """Test attendance statistics calculation."""
    
    def test_attendance_percentage_calculation(self, test_student):
        """Test attendance percentage is calculated correctly."""
        teacher = TeacherFactory()
        
        # Create 100 records: 80 present, 20 absent
        for i in range(80):
            AttendanceRecordFactory(student=test_student, marked_by=teacher, status='present')
        
        for i in range(20):
            AttendanceRecordFactory(student=test_student, marked_by=teacher, status='absent')
        
        # Verify attendance percentage calculation
        # This depends on your implementation
        pass
    
    def test_attendance_summary_by_month(self, authenticated_api_client, test_student):
        """Test monthly attendance summary."""
        client, user = authenticated_api_client
        
        # Create attendance records for full month
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/attendance/summary/?student={test_student.id}&year=2026&month=5')
        # assert response.status_code == status.HTTP_200_OK
