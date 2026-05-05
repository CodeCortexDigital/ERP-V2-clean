from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SchoolClass, Section

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_classes_with_sections(request):
    """Get all classes with their sections"""
    print("=== get_classes_with_sections called ===")  # Debug log
    classes = SchoolClass.objects.filter(is_active=True).order_by('code')
    data = []
    for school_class in classes:
        sections = Section.objects.filter(class_ref=school_class, is_active=True).order_by('name')
        data.append({
            'id': str(school_class.id),
            'code': school_class.code,
            'name': school_class.name,
            'sections': [
                {'id': str(section.id), 'name': section.name, 'code': section.code}
                for section in sections
            ]
        })
    print(f"Returning {len(data)} classes")  # Debug log
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sections_for_class(request, class_id):
    """Get sections for a specific class"""
    try:
        sections = Section.objects.filter(class_ref_id=class_id, is_active=True).order_by('name')
        data = [
            {'id': str(section.id), 'name': section.name, 'code': section.code}
            for section in sections
        ]
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=400)
