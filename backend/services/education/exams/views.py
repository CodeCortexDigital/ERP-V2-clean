from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

class ExamsViewSet(ViewSet):
    """Exams API with proper CRUD operations"""
    
    exams = [
        {"id": 1, "course": "CS101", "title": "Introduction to Programming - Midterm", "date": "2024-10-15", "time": "09:00", "duration": 120, "room": "Room 101", "exam_type": "midterm"},
        {"id": 2, "course": "MATH101", "title": "Calculus I - Final Exam", "date": "2024-12-20", "time": "14:00", "duration": 180, "room": "Hall A", "exam_type": "final"},
        {"id": 3, "course": "ENG101", "title": "English Composition - Quiz 1", "date": "2024-09-30", "time": "10:00", "duration": 30, "room": "Room 301", "exam_type": "quiz"},
        {"id": 4, "course": "CS201", "title": "Data Structures - Midterm", "date": "2024-10-18", "time": "11:00", "duration": 90, "room": "Room 102", "exam_type": "midterm"},
        {"id": 5, "course": "PHY101", "title": "Physics I - Final Exam", "date": "2024-12-22", "time": "09:00", "duration": 180, "room": "Hall B", "exam_type": "final"},
    ]
    
    def list(self, request):
        return Response({"count": len(self.exams), "results": self.exams})
    
    def retrieve(self, request, pk=None):
        for e in self.exams:
            if e['id'] == int(pk):
                return Response(e)
        return Response({"error": "Exam not found"}, status=status.HTTP_404_NOT_FOUND)



