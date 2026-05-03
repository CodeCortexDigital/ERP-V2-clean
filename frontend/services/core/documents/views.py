from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def document_list(request):
    return Response({'count': 6, 'results': [
        {'id': 1, 'title': 'Student Handbook', 'type': 'pdf', 'size': '2.5 MB', 'upload_date': '2024-01-15'},
        {'id': 2, 'title': 'Faculty Manual', 'type': 'pdf', 'size': '1.8 MB', 'upload_date': '2024-01-20'},
        {'id': 3, 'title': 'Annual Report 2024', 'type': 'docx', 'size': '3.2 MB', 'upload_date': '2024-02-01'},
    ]})
