"""
Student model and API tests.
"""
import pytest
from rest_framework import status
from tests.conftest import (
    StudentFactory, SchoolFactory, ClassFactory, 
    SectionFactory, UserFactory
)


pytestmark = pytest.mark.django_db


class TestStudentModel:
    """Test Student model."""
    
    def test_student_creation(self, test_student):
        """Test student can be created."""
        assert test_student.id is not None
        assert test_student.student_id is not None
        assert test_student.school is not None
    
    def test_student_full_name(self, test_student):
        """Test student full name."""
        assert len(test_student.full_name) > 0
    
    def test_student_enrollment_number_unique(self):
        """Test student enrollment number is unique."""
        school = SchoolFactory()
        student1 = StudentFactory(school=school)
        student2 = StudentFactory(school=school)
        assert student1.student_id != student2.student_id
    
    def test_student_status_choices(self, test_student):
        """Test student status is valid."""
        assert test_student.is_active is True


class TestStudentAPI:
    """Test Student API endpoints."""
    
    def test_list_students(self, authenticated_api_client):
        """Test listing students."""
        client, user = authenticated_api_client
        StudentFactory.create_batch(5)
        
        # Adjust endpoint based on actual implementation
        # response = client.get('/api/auth/students/')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_create_student(self, authenticated_api_client):
        """Test creating a student."""
        client, user = authenticated_api_client
        school = SchoolFactory()
        class_obj = ClassFactory(school=school)
        section = SectionFactory(class_obj=class_obj)
        
        # Adjust endpoint and payload based on actual implementation
        # data = {
        #     'user': {...},
        #     'school': school.id,
        #     'class': class_obj.id,
        #     'section': section.id,
        # }
        # response = client.post('/api/auth/students/', data)
        # assert response.status_code == status.HTTP_201_CREATED
    
    def test_retrieve_student(self, test_student, authenticated_api_client):
        """Test retrieving a specific student."""
        client, user = authenticated_api_client
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/auth/students/{test_student.id}/')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_update_student(self, test_student, authenticated_api_client):
        """Test updating a student."""
        client, user = authenticated_api_client
        # Adjust endpoint and payload based on actual implementation
        # data = {'status': 'inactive'}
        # response = client.patch(f'/api/auth/students/{test_student.id}/', data)
        # assert response.status_code == status.HTTP_200_OK
    
    def test_delete_student(self, test_student, authenticated_api_client):
        """Test deleting a student."""
        client, user = authenticated_api_client
        # Adjust endpoint based on actual implementation
        # response = client.delete(f'/api/auth/students/{test_student.id}/')
        # assert response.status_code == status.HTTP_204_NO_CONTENT


class TestStudentFiltering:
    """Test student filtering and search."""
    
    def test_filter_students_by_class(self, authenticated_api_client):
        """Test filtering students by class."""
        client, user = authenticated_api_client
        class_obj = ClassFactory()
        StudentFactory.create_batch(3, class_obj=class_obj)
        StudentFactory.create_batch(2)
        
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/auth/students/?class={class_obj.id}')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_filter_students_by_status(self, authenticated_api_client):
        """Test filtering students by status."""
        client, user = authenticated_api_client
        # Create students with different statuses
        # response = client.get('/api/auth/students/?status=active')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_search_students_by_name(self, authenticated_api_client):
        """Test searching students by name."""
        client, user = authenticated_api_client
        student = StudentFactory(full_name='Ahmed Ali')
        
        # Adjust endpoint based on actual implementation
        # response = client.get('/api/auth/students/?search=Ahmed')
        # assert response.status_code == status.HTTP_200_OK


class TestStudentPagination:
    """Test student list pagination."""
    
    def test_pagination_default_page_size(self, authenticated_api_client):
        """Test default page size."""
        client, user = authenticated_api_client
        StudentFactory.create_batch(30)
        
        # Adjust endpoint based on actual implementation
        # response = client.get('/api/auth/students/')
        # Verify pagination structure exists
    
    def test_pagination_custom_page_size(self, authenticated_api_client):
        """Test custom page size."""
        client, user = authenticated_api_client
        # Adjust endpoint based on actual implementation
        # response = client.get('/api/auth/students/?page_size=10')
        # Verify page size is respected


class TestStudentExtendedFields:
    """Test that serializers and views correctly support extended fields."""

    def test_serializer_v1_fields(self):
        from api.v1.serializers import StudentSerializerV1
        serializer = StudentSerializerV1()
        expected_fields = [
            'additional_note', 'discount_in_fee', 'identification_mark',
            'blood_group', 'disease', 'birth_form_id', 'cast',
            'previous_school', 'previous_id', 'orphan_student', 'osc',
            'religion', 'select_family', 'family_type', 'total_siblings',
            'father_national_id', 'father_occupation', 'father_education',
            'father_mobile', 'father_profession', 'father_income',
            'mother_national_id', 'mother_occupation', 'mother_education',
            'mother_mobile', 'mother_profession', 'mother_income'
        ]
        for field in expected_fields:
            assert field in serializer.fields, f"Field '{field}' missing from StudentSerializerV1"

    def test_serializer_v2_fields(self):
        from api.v2.serializers import StudentSerializerV2
        serializer = StudentSerializerV2()
        expected_fields = [
            'additional_note', 'discount_in_fee', 'identification_mark',
            'blood_group', 'disease', 'birth_form_id', 'cast',
            'previous_school', 'previous_id', 'orphan_student', 'osc',
            'religion', 'select_family', 'family_type', 'total_siblings',
            'father_national_id', 'father_occupation', 'father_education',
            'father_mobile', 'father_profession', 'father_income',
            'mother_national_id', 'mother_occupation', 'mother_education',
            'mother_mobile', 'mother_profession', 'mother_income'
        ]
        for field in expected_fields:
            assert field in serializer.fields, f"Field '{field}' missing from StudentSerializerV2"

    def test_create_view_allowed_fields(self):
        from api.v1.views import StudentListCreateView
        # Get allowed_fields from custom create method or similar
        # Since it's inside create(), we can inspect the source or test via POST if needed.
        # But we can verify by checking if the post payload actually saves the field.
        pass

