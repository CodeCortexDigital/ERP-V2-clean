
# ============================================================
# PDF GENERATION
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_result_card(request, student_id):
    """Download result card PDF"""
    from django.http import HttpResponse
    from services.pdf.pdf_generator import PDFGenerator
    from django.apps import apps
    
    Student = apps.get_model('education_students', 'Student')
    
    try:
        student = Student.objects.get(id=student_id)
        generator = PDFGenerator()
        pdf_buffer = generator.generate_result_card(student, [], None)
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="result_card_{student.student_id}.pdf"'
        return response
    except Exception as e:
        return Response({'error': str(e)}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_fee_receipt(request, invoice_id):
    """Download fee receipt PDF"""
    from django.http import HttpResponse
    from services.pdf.pdf_generator import PDFGenerator
    from django.apps import apps
    
    try:
        generator = PDFGenerator()
        pdf_buffer = generator.generate_fee_receipt(None, None, [])
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="fee_receipt_{invoice_id}.pdf"'
        return response
    except Exception as e:
        return Response({'error': str(e)}, status=404)
