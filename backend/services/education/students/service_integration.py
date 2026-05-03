import requests
import logging
from django.conf import settings
from django.core.cache import cache
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from requests.exceptions import Timeout, ConnectionError

logger = logging.getLogger(__name__)

class AcademicsServiceClient:
    """Client to communicate with Academics Service"""
    
    def __init__(self):
        self.base_url = settings.ACADEMICS_SERVICE_URL
        self.headers = {
            'X-API-Key': settings.INTERNAL_API_KEY,
            'Content-Type': 'application/json'
        }
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((Timeout, ConnectionError))
    )
    def get_program(self, program_id):
        """Get program details from Academics service"""
        cache_key = f"academics_program_{program_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/programs/{program_id}/",
                headers=self.headers,
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                cache.set(cache_key, data, timeout=3600)  # Cache for 1 hour
                return data
            elif response.status_code == 404:
                logger.warning(f"Program {program_id} not found in Academics service")
                return None
            else:
                logger.error(f"Error fetching program {program_id}: {response.status_code}")
                return None
        except Timeout:
            logger.error(f"Timeout fetching program {program_id}")
            raise
        except ConnectionError:
            logger.error(f"Connection error fetching program {program_id}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching program {program_id}: {str(e)}")
            return None
    
    def get_programs(self, program_ids=None):
        """Get multiple programs"""
        if program_ids:
            programs = []
            for pid in program_ids:
                program = self.get_program(pid)
                if program:
                    programs.append(program)
            return programs
        
        # Get all programs
        cache_key = "academics_all_programs"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/programs/",
                headers=self.headers,
                timeout=5
            )
            if response.status_code == 200:
                data = response.json().get('results', [])
                cache.set(cache_key, data, timeout=3600)
                return data
        except Exception as e:
            logger.error(f"Failed to fetch programs: {str(e)}")
        return []

class AdmissionServiceClient:
    """Client to communicate with Admission Service"""
    
    def __init__(self):
        self.base_url = settings.ADMISSION_SERVICE_URL
        self.headers = {
            'X-API-Key': settings.INTERNAL_API_KEY,
            'Content-Type': 'application/json'
        }
    
    def get_application(self, application_id):
        """Get application details from Admission service"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/applications/{application_id}/",
                headers=self.headers,
                timeout=5
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch application {application_id}: {str(e)}")
        return None
    
    def update_application_with_student_id(self, application_id, student_id):
        """Update application with created student ID"""
        try:
            response = requests.patch(
                f"{self.base_url}/api/v1/applications/{application_id}/",
                headers=self.headers,
                json={'student_id': str(student_id)},
                timeout=5
            )
            if response.status_code == 200:
                logger.info(f"Updated application {application_id} with student {student_id}")
                return True
        except Exception as e:
            logger.error(f"Failed to update application {application_id}: {str(e)}")
        return False

class AttendanceServiceClient:
    """Client to communicate with Attendance Service"""
    
    def __init__(self):
        self.base_url = settings.ATTENDANCE_SERVICE_URL
        self.headers = {
            'X-API-Key': settings.INTERNAL_API_KEY,
            'Content-Type': 'application/json'
        }
    
    def get_student_attendance(self, student_id, semester=None):
        """Get attendance summary for a student"""
        params = {'student_id': student_id}
        if semester:
            params['semester'] = semester
        
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/summaries/",
                headers=self.headers,
                params=params,
                timeout=5
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch attendance for student {student_id}: {str(e)}")
        return None

class GradeScaleServiceClient:
    """Client to communicate with Grade Scale Service"""
    
    def __init__(self):
        self.base_url = settings.GRADE_SCALE_SERVICE_URL
        self.headers = {
            'X-API-Key': settings.INTERNAL_API_KEY,
            'Content-Type': 'application/json'
        }
    
    def get_student_grades(self, student_id, semester=None):
        """Get grade summary for a student"""
        params = {'student_id': student_id}
        if semester:
            params['semester'] = semester
        
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/student-grades/",
                headers=self.headers,
                params=params,
                timeout=5
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch grades for student {student_id}: {str(e)}")
        return None
    
    def calculate_gpa(self, grades):
        """Calculate GPA from grades"""
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/calculate-gpa/",
                headers=self.headers,
                json={'grades': grades},
                timeout=5
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Failed to calculate GPA: {str(e)}")
        return None