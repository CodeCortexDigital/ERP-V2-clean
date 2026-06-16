from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Q, Count, Avg
from django.utils import timezone
from django.utils.dateparse import parse_date
from services.education.students.models import Student
from .models import (
    FeeStructure,
    Invoice,
    Payment,
    InstallmentPlan,
    Scholarship,
    StudentScholarship,
    LateFeeRule,
    TransactionLog,
    PaymentGatewayConfig,
    PaymentTransaction,
    FinanceSettings,
)
from .serializers import (
    FeeStructureSerializer,
    InvoiceSerializer,
    PaymentSerializer,
    InstallmentPlanSerializer,
    ScholarshipSerializer,
    StudentScholarshipSerializer,
    LateFeeRuleSerializer,
    TransactionLogSerializer,
    FinanceSettingsSerializer,
    PaymentGatewayConfigSerializer,
    PaymentTransactionSerializer,
)
from django.apps import apps
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal

from services.communication.whatsapp.tasks import send_whatsapp_message
from .payments import (
    generate_payment_session,
    verify_gateway_webhook,
    process_gateway_webhook,
    get_active_gateway_config,
)

Student = apps.get_model('education_students', 'Student')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')

class FeeStructureListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FeeStructureSerializer

    def get_queryset(self):
        queryset = FeeStructure.objects.select_related(
            'class_ref',
            'section'
        )

        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(fee_name__icontains=search) |
                Q(class_ref__name__icontains=search)
            )

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save()        

class FeeStructureDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    lookup_field = 'id'
    
    def update(self, request, *args, **kwargs):
        """Custom update to handle business logic"""
        instance = self.get_object()
        # Add any business logic for fee structure updates here
        return super().update(request, *args, **kwargs)

class InvoiceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        from django.db.models import Q
        from django.utils import timezone

        queryset = Invoice.objects.select_related(
            "student",
            "student__current_class"
        )

        # Student filter
        student_id = self.request.query_params.get("student_id") or self.request.query_params.get("student")
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        # Status filter
        status = self.request.query_params.get("status")
        if status:
            if status == "overdue":
                queryset = queryset.filter(
                    due_date__lt=timezone.now().date(),
                    status__in=["issued", "partial", "overdue"]
                )
            else:
                queryset = queryset.filter(status=status)

        # Class filter
        class_id = self.request.query_params.get("class_id")
        if class_id:
            queryset = queryset.filter(
                student__current_class_id=class_id
            )

        # Date filters
        start_date = self.request.query_params.get("start_date")
        if start_date:
            queryset = queryset.filter(
                due_date__gte=start_date
            )

        end_date = self.request.query_params.get("end_date")
        if end_date:
            queryset = queryset.filter(
                due_date__lte=end_date
            )

        # Search
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(student__full_name__icontains=search)
            )

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        student_id = self.request.data.get("student")
        student = Student.objects.get(id=student_id)

        serializer.save(
            tenant=student.tenant
        )


class InvoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    lookup_field = 'id'
    
    def update(self, request, *args, **kwargs):
        """Custom update to handle business logic"""
        instance = self.get_object()
        old_status = instance.status
        
        response = super().update(request, *args, **kwargs)
        
        # If status changed to paid, ensure paid_amount equals total_amount
        if response.status_code == 200:
            updated_instance = self.get_object()
            if updated_instance.status == 'paid' and updated_instance.paid_amount < updated_instance.total_amount:
                updated_instance.paid_amount = updated_instance.total_amount
                updated_instance.save()
        
        return response

class PaymentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        queryset = Payment.objects.select_related(
            'invoice__student'
        )

        invoice_id = self.request.query_params.get('invoice')
        if invoice_id:
            queryset = queryset.filter(
                invoice_id=invoice_id
            )

        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(
                payment_date__gte=start_date
            )

        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(
                payment_date__lte=end_date
            )

        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(
                payment_method=payment_method
            )

        return queryset.order_by('-payment_date')

    def perform_create(self, serializer):

        payment = serializer.save(
            received_by=self.request.user
        )

        invoice = payment.invoice

        # Calculate all payments made for this invoice
        total_paid = invoice.payments.aggregate(
            total=Sum('amount')
        )['total'] or 0

        invoice.paid_amount = total_paid

        # Finance status logic
        if total_paid >= invoice.total_amount:
            invoice.status = 'paid'

        elif total_paid > 0:
            # Partial payment made - always show as partial regardless of due date
            # 'overdue' only applies when NO payment has been made
            invoice.status = 'partial'

        else:
            if invoice.due_date < timezone.now().date():
                invoice.status = 'overdue'
            else:
                invoice.status = 'issued'

        invoice.save()
        
class PaymentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    lookup_field = 'id'
    
    def update(self, request, *args, **kwargs):
        """Custom update to handle payment changes"""
        instance = self.get_object()
        old_amount = instance.amount
        
        response = super().update(request, *args, **kwargs)
        
        # Update invoice paid amount when payment is modified
        if response.status_code == 200:
            updated_instance = self.get_object()
            invoice = updated_instance.invoice
            total_paid = invoice.payments.aggregate(total=Sum('amount'))['total'] or 0
            invoice.paid_amount = total_paid
            if total_paid >= invoice.total_amount:
                invoice.status = 'paid'
            elif total_paid > 0:
                # Partial payment made - always show as partial regardless of due date
                invoice.status = 'partial'
            else:
                if invoice.due_date < timezone.now().date():
                    invoice.status = 'overdue'
                else:
                    invoice.status = 'issued'
            invoice.save()
        
        return response


class InstallmentPlanListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = InstallmentPlan.objects.filter(is_active=True)
    serializer_class = InstallmentPlanSerializer


class InstallmentPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = InstallmentPlan.objects.all()
    serializer_class = InstallmentPlanSerializer
    lookup_field = 'id'


class ScholarshipListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Scholarship.objects.filter(is_active=True)
    serializer_class = ScholarshipSerializer


class ScholarshipDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Scholarship.objects.all()
    serializer_class = ScholarshipSerializer
    lookup_field = 'id'


class StudentScholarshipListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = StudentScholarshipSerializer
    
    def get_queryset(self):
        queryset = StudentScholarship.objects.select_related('student', 'scholarship')
        student_id = self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset.filter(is_active=True)


class StudentScholarshipDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = StudentScholarship.objects.all()
    serializer_class = StudentScholarshipSerializer
    lookup_field = 'id'


class LateFeeRuleListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = LateFeeRule.objects.filter(is_active=True)
    serializer_class = LateFeeRuleSerializer


class LateFeeRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = LateFeeRule.objects.all()
    serializer_class = LateFeeRuleSerializer
    lookup_field = 'id'


class TransactionLogListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionLogSerializer
    
    def get_queryset(self):
        queryset = TransactionLog.objects.select_related('user')
        model_name = self.request.query_params.get('model')
        if model_name:
            queryset = queryset.filter(model_name=model_name)
        
        object_id = self.request.query_params.get('object_id')
        if object_id:
            queryset = queryset.filter(object_id=object_id)
        
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-timestamp')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance_summary(request):
    """Get finance summary for dashboard using correct balance calculation"""
    total_invoices = Invoice.objects.count()
    
    # FIXED: Use sum of balance_due property instead of simple subtraction
    # This properly accounts for discounts and late fees
    all_invoices = Invoice.objects.all()
    balance_due = sum(invoice.balance_due for invoice in all_invoices)
    total_paid = Invoice.objects.aggregate(total=Sum('paid_amount'))['total'] or 0
    
    # Calculate total_amount as total_paid + balance_due to keep all cards aligned
    total_amount = total_paid + balance_due
    collection_rate = round((float(total_paid) / float(total_amount) * 100), 1) if total_amount > 0 else 0
    
    return Response({
        'total_invoices': total_invoices,
        'total_amount': float(total_amount),
        'total_paid': float(total_paid),
        'balance_due': float(balance_due),
        'collection_rate': collection_rate,
    })

class PaymentGatewayConfigListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = PaymentGatewayConfig.objects.all()
    serializer_class = PaymentGatewayConfigSerializer


class PaymentGatewayConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = PaymentGatewayConfig.objects.all()
    serializer_class = PaymentGatewayConfigSerializer
    lookup_field = 'id'


class PaymentTransactionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentTransactionSerializer

    def get_queryset(self):
        queryset = PaymentTransaction.objects.select_related('invoice')
        invoice_id = self.request.query_params.get('invoice')
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)

        gateway = self.request.query_params.get('gateway')
        if gateway:
            queryset = queryset.filter(gateway=gateway)

        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        return queryset.order_by('-created_at')


class InvoicePaymentSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        invoice_id = request.data.get('invoice_id')
        provider = request.data.get('provider', 'jazzcash')
        customer_name = request.data.get('customer_name')
        customer_phone = request.data.get('customer_phone')

        if not invoice_id:
            return Response({'error': 'Invoice ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invoice = Invoice.objects.get(id=invoice_id)
            transaction, checkout_url = generate_payment_session(
                invoice,
                provider=provider,
                customer_name=customer_name,
                customer_phone=customer_phone,
            )

            return Response({
                'session_id': str(transaction.id),
                'checkout_url': checkout_url,
                'gateway_reference': transaction.gateway_reference,
                'amount': float(transaction.amount),
                'currency': transaction.currency,
                'provider': provider,
                'invoice_number': invoice.invoice_number,
            })
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'error': f'Unable to create payment session: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymentGatewayWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, provider):
        payload = request.data
        headers = {k: v for k, v in request.headers.items()}

        if not verify_gateway_webhook(provider, payload, headers):
            return Response({'error': 'Invalid webhook signature or missing configuration'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            transaction = process_gateway_webhook(provider, payload)
            return Response({
                'message': 'Webhook processed successfully',
                'transaction_id': str(transaction.id),
                'gateway_reference': transaction.gateway_reference,
                'status': transaction.status,
            })
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({'error': f'Failed to process webhook: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_receipt(request, invoice_id):
    """Generate printable invoice receipt with student history"""

    try:
        invoice = Invoice.objects.select_related(
            'student',
            'fee_structure'
        ).get(id=invoice_id)

        # Current invoice payments
        payments = Payment.objects.filter(
            invoice=invoice
        ).order_by('-payment_date')

        # Last 6 previous invoices of same student
        previous_invoices = Invoice.objects.filter(
            student=invoice.student
        ).exclude(
            id=invoice.id
        ).order_by('-issue_date')[:6]

        context = {
            'invoice': invoice,
            'payments': payments,
            'previous_invoices': previous_invoices,
            'school_name': 'ERP School Management System',
            'generated_date': timezone.now(),
        }

        html_content = render_to_string(
            'finance/invoice_receipt.html',
            context
        )

        return Response({
            'html_content': html_content
        })

    except Invoice.DoesNotExist:
        return Response({
            'error': 'Invoice not found'
        }, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_receipt(request, payment_id):
    """Generate printable payment receipt"""
    try:
        payment = Payment.objects.select_related('invoice__student').get(id=payment_id)
        
        context = {
            'payment': payment,
            'school_name': 'ERP School Management System',
            'generated_date': timezone.now(),
        }
        
        html_content = render_to_string('finance/payment_receipt.html', context)
        return Response({'html_content': html_content})
    except Payment.DoesNotExist:
        return Response({'error': 'Payment not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_invoices_csv(request):
    """Export invoices to CSV"""
    # Build queryset with filters
    queryset = Invoice.objects.select_related('student', 'fee_structure')
    
    status = request.query_params.get('status')
    if status:
        if status == 'overdue':
            queryset = queryset.filter(due_date__lt=timezone.now().date(), status__in=['issued', 'partial', 'overdue'])
        else:
            queryset = queryset.filter(status=status)
    
    class_id = request.query_params.get('class_id')
    if class_id:
        queryset = queryset.filter(student__current_class_id=class_id)
    
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    if start_date:
        queryset = queryset.filter(due_date__gte=start_date)
    if end_date:
        queryset = queryset.filter(due_date__lte=end_date)
    
    invoices = queryset.order_by('-due_date')
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="invoices_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Invoice Number', 'Student ID', 'Student Name', 'Class', 'Amount', 
        'Paid Amount', 'Balance Due', 'Status', 'Due Date', 'Issue Date'
    ])
    
    for invoice in invoices:
        writer.writerow([
            invoice.invoice_number,
            invoice.student.student_id,
            invoice.student.full_name,
            invoice.student.current_class.name if invoice.student.current_class else '',
            invoice.amount,
            invoice.paid_amount,
            invoice.balance_due,
            invoice.status,
            invoice.due_date,
            invoice.issue_date
        ])
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_payments_csv(request):
    """Export payments to CSV"""
    queryset = Payment.objects.select_related('invoice__student')
    
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    if start_date:
        queryset = queryset.filter(payment_date__gte=start_date)
    if end_date:
        queryset = queryset.filter(payment_date__lte=end_date)
    
    payment_method = request.query_params.get('payment_method')
    if payment_method:
        queryset = queryset.filter(payment_method=payment_method)
    
    payments = queryset.order_by('-payment_date')
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="payments_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Payment ID', 'Invoice Number', 'Student Name', 'Amount', 
        'Payment Method', 'Payment Date', 'Transaction ID', 'Notes'
    ])
    
    for payment in payments:
        writer.writerow([
            payment.id,
            payment.invoice.invoice_number,
            payment.invoice.student.full_name,
            payment.amount,
            payment.payment_method,
            payment.payment_date,
            payment.transaction_id or '',
            payment.notes or ''
        ])
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance_report_pdf(request):
    """Generate PDF finance report"""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        
        # Get data
        total_invoices = Invoice.objects.count()
        total_amount = Invoice.objects.aggregate(total=Sum('amount'))['total'] or 0
        total_paid = Invoice.objects.aggregate(total=Sum('paid_amount'))['total'] or 0
        balance_due = total_amount - total_paid
        
        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        
        # Title
        title = Paragraph("Finance Report", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 12))
        
        # Summary data
        summary_data = [
            ['Metric', 'Value'],
            ['Total Invoices', str(total_invoices)],
            ['Total Amount', f'${total_amount:.2f}'],
            ['Total Paid', f'${total_paid:.2f}'],
            ['Balance Due', f'${balance_due:.2f}'],
            ['Collection Rate', f'{(total_paid/total_amount*100):.1f}%' if total_amount > 0 else '0%']
        ]
        
        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(summary_table)
        
        doc.build(elements)
        buffer.seek(0)
        
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="finance_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf"'
        return response
        
    except ImportError:
        return Response({'error': 'PDF generation requires reportlab. Install with: pip install reportlab'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_pdf(request, invoice_id):
    """Generate detailed PDF invoice"""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        
        invoice = Invoice.objects.select_related('student', 'fee_structure', 'installment_plan', 'scholarship').get(id=invoice_id)
        payments = Payment.objects.filter(invoice=invoice).order_by('-payment_date')
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        
        # Header
        title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=20, spaceAfter=20)
        title = Paragraph(f"INVOICE - {invoice.invoice_number}", title_style)
        elements.append(title)
        
        # Invoice details
        details_data = [
            ['Invoice Number:', invoice.invoice_number],
            ['Issue Date:', invoice.issue_date.strftime('%B %d, %Y')],
            ['Due Date:', invoice.due_date.strftime('%B %d, %Y')],
            ['Status:', invoice.get_status_display().upper()],
        ]
        
        details_table = Table(details_data, colWidths=[120, 200])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 20))
        
        # Student details
        student_title = Paragraph("Student Information", styles['Heading2'])
        elements.append(student_title)
        
        student_data = [
            ['Student ID:', invoice.student.student_id],
            ['Student Name:', invoice.student.full_name],
            ['Class:', invoice.student.current_class.name if invoice.student.current_class else 'N/A'],
        ]
        
        student_table = Table(student_data, colWidths=[120, 200])
        student_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        elements.append(student_table)
        elements.append(Spacer(1, 20))
        
        # Fee details
        fee_title = Paragraph("Fee Details", styles['Heading2'])
        elements.append(fee_title)
        
        fee_data = [
            ['Description', 'Amount'],
            [f"Fee: {invoice.fee_structure.fee_name if invoice.fee_structure else 'Custom Fee'}", f"${invoice.amount:.2f}"],
        ]
        
        if invoice.discount_amount > 0:
            fee_data.append(['Discount', f"-${invoice.discount_amount:.2f}"])
        
        if invoice.late_fee_amount > 0:
            fee_data.append(['Late Fee', f"${invoice.late_fee_amount:.2f}"])
        
        fee_data.append(['Total Amount', f"${invoice.total_amount:.2f}"])
        fee_data.append(['Amount Paid', f"${invoice.paid_amount:.2f}"])
        fee_data.append(['Balance Due', f"${invoice.balance_due:.2f}"])
        
        fee_table = Table(fee_data, colWidths=[300, 100])
        fee_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (-2, -1), (-1, -1), colors.lightgreen),
            ('BACKGROUND', (-2, -2), (-1, -2), colors.lightcoral),
        ]))
        elements.append(fee_table)
        
        # Payment history
        if payments:
            elements.append(Spacer(1, 20))
            payment_title = Paragraph("Payment History", styles['Heading2'])
            elements.append(payment_title)
            
            payment_data = [['Date', 'Amount', 'Method', 'Transaction ID']]
            for payment in payments:
                payment_data.append([
                    payment.payment_date.strftime('%m/%d/%Y'),
                    f"${payment.amount:.2f}",
                    payment.get_payment_method_display(),
                    payment.transaction_id or '-'
                ])
            
            payment_table = Table(payment_data, colWidths=[80, 80, 100, 120])
            payment_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(payment_table)
        
        # Footer
        elements.append(Spacer(1, 30))
        footer = Paragraph("Thank you for your business!", styles['Normal'])
        elements.append(footer)
        
        doc.build(elements)
        buffer.seek(0)
        
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}_{datetime.now().strftime("%Y%m%d")}.pdf"'
        return response
        
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)
    except ImportError:
        return Response({'error': 'PDF generation requires reportlab'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def defaulter_report_pdf(request):
    """Generate PDF defaulter report"""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        
        queryset = Invoice.objects.select_related('student').filter(
            status__in=['overdue', 'issued'],
            due_date__lt=timezone.now().date()
        ).order_by('due_date')
        
        defaulters = []
        for invoice in queryset:
            days_overdue = (timezone.now().date() - invoice.due_date).days
            defaulters.append({
                'student_id': invoice.student.student_id,
                'student_name': invoice.student.full_name,
                'class_name': invoice.student.current_class.name if invoice.student.current_class else '',
                'invoice_number': invoice.invoice_number,
                'amount_due': float(invoice.balance_due),
                'days_overdue': days_overdue,
                'due_date': invoice.due_date
            })
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
        styles = getSampleStyleSheet()
        elements = []
        
        # Title
        title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=18, spaceAfter=20)
        title = Paragraph("Defaulter Report", title_style)
        elements.append(title)
        
        subtitle = Paragraph(f"Generated on {timezone.now().strftime('%B %d, %Y')}", styles['Normal'])
        elements.append(subtitle)
        elements.append(Spacer(1, 20))
        
        if defaulters:
            # Summary
            total_defaulters = len(defaulters)
            total_amount = sum(d['amount_due'] for d in defaulters)
            
            summary_data = [
                ['Total Defaulters:', str(total_defaulters)],
                ['Total Amount Due:', f"${total_amount:.2f}"],
            ]
            
            summary_table = Table(summary_data, colWidths=[150, 200])
            summary_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ]))
            elements.append(summary_table)
            elements.append(Spacer(1, 20))
            
            # Defaulter table
            table_data = [['Student ID', 'Student Name', 'Class', 'Invoice #', 'Amount Due', 'Days Overdue', 'Due Date']]
            
            for defaulter in defaulters:
                table_data.append([
                    defaulter['student_id'],
                    defaulter['student_name'],
                    defaulter['class_name'],
                    defaulter['invoice_number'],
                    f"${defaulter['amount_due']:.2f}",
                    str(defaulter['days_overdue']),
                    defaulter['due_date'].strftime('%m/%d/%Y')
                ])
            
            table = Table(table_data, colWidths=[80, 120, 80, 100, 80, 80, 80])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkred),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            elements.append(table)
        else:
            no_data = Paragraph("No defaulters found.", styles['Normal'])
            elements.append(no_data)
        
        doc.build(elements)
        buffer.seek(0)
        
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="defaulter_report_{datetime.now().strftime("%Y%m%d")}.pdf"'
        return response
        
    except ImportError:
        return Response({'error': 'PDF generation requires reportlab'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_finance_report_pdf(request):
    """Generate comprehensive monthly finance report"""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        
        # Get current month data
        today = timezone.now().date()
        month_start = today.replace(day=1)
        month_end = today
        
        # Previous month for comparison
        prev_month = month_start - timedelta(days=1)
        prev_month_start = prev_month.replace(day=1)
        
        # Current month stats
        current_payments = Payment.objects.filter(
            payment_date__gte=month_start,
            payment_date__lte=month_end
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        current_invoices = Invoice.objects.filter(
            issue_date__gte=month_start,
            issue_date__lte=month_end
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Previous month stats
        prev_payments = Payment.objects.filter(
            payment_date__gte=prev_month_start,
            payment_date__lte=prev_month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        prev_invoices = Invoice.objects.filter(
            issue_date__gte=prev_month_start,
            issue_date__lte=prev_month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Outstanding balances
        outstanding = Invoice.objects.filter(
            status__in=['issued', 'partial', 'overdue']
        ).aggregate(total=Sum('balance_due'))['total'] or 0
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        
        # Title
        title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=18, spaceAfter=20)
        title = Paragraph(f"Monthly Finance Report - {month_start.strftime('%B %Y')}", title_style)
        elements.append(title)
        
        # Monthly Summary
        summary_title = Paragraph("Monthly Summary", styles['Heading2'])
        elements.append(summary_title)
        
        summary_data = [
            ['Metric', 'Current Month', 'Previous Month', 'Change %'],
            ['Revenue Collected', f"${current_payments:.2f}", f"${prev_payments:.2f}", 
             f"{((current_payments - prev_payments) / prev_payments * 100):.1f}%" if prev_payments > 0 else "N/A"],
            ['Invoices Generated', f"${current_invoices:.2f}", f"${prev_invoices:.2f}",
             f"{((current_invoices - prev_invoices) / prev_invoices * 100):.1f}%" if prev_invoices > 0 else "N/A"],
            ['Outstanding Balance', f"${outstanding:.2f}", '-', '-'],
        ]
        
        summary_table = Table(summary_data, colWidths=[150, 100, 100, 80])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
        
        # Class-wise collection
        class_title = Paragraph("Class-wise Collection", styles['Heading2'])
        elements.append(class_title)
        
        class_data = Invoice.objects.filter(
            student__current_class__isnull=False
        ).values(
            'student__current_class__name'
        ).annotate(
            total_invoices=Count('id'),
            total_amount=Sum('amount'),
            total_paid=Sum('paid_amount'),
        ).order_by('student__current_class__name')
        
        class_table_data = [['Class', 'Invoices', 'Total Amount', 'Paid Amount', 'Collection %']]
        for data in class_data:
            collection_rate = (data['total_paid'] / data['total_amount'] * 100) if data['total_amount'] > 0 else 0
            class_table_data.append([
                data['student__current_class__name'],
                str(data['total_invoices']),
                f"${data['total_amount']:.2f}",
                f"${data['total_paid']:.2f}",
                f"{collection_rate:.1f}%"
            ])
        
        class_table = Table(class_table_data, colWidths=[80, 60, 80, 80, 80])
        class_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(class_table)
        
        doc.build(elements)
        buffer.seek(0)
        
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="monthly_finance_report_{month_start.strftime("%Y%m")}.pdf"'
        return response
        
    except ImportError:
        return Response({'error': 'PDF generation requires reportlab'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_revenue_chart(request):
    """Get monthly revenue data for charts"""
    months = request.query_params.get('months', 12)
    try:
        months = int(months)
    except ValueError:
        months = 12
    
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=30 * months)
    
    monthly_data = []
    current_date = start_date
    
    while current_date <= end_date:
        month_start = current_date.replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        payments = Payment.objects.filter(
            payment_date__gte=month_start,
            payment_date__lte=month_end
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        monthly_data.append({
            'month': month_start.strftime('%Y-%m'),
            'revenue': float(payments)
        })
        
        current_date = month_end + timedelta(days=1)
    
    return Response(monthly_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def defaulter_report(request):
    """Get report of students with overdue payments"""
    queryset = Invoice.objects.select_related('student').filter(
        status__in=['overdue', 'issued'],
        due_date__lt=timezone.now().date()
    ).order_by('due_date')
    
    defaulters = []
    for invoice in queryset:
        days_overdue = (timezone.now().date() - invoice.due_date).days
        defaulters.append({
            'student_id': invoice.student.student_id,
            'student_name': invoice.student.full_name,
            'class_name': invoice.student.current_class.name if invoice.student.current_class else '',
            'invoice_number': invoice.invoice_number,
            'amount_due': float(invoice.balance_due),
            'days_overdue': days_overdue,
            'due_date': invoice.due_date
        })
    
    return Response({
        'total_defaulters': len(defaulters),
        'total_amount_due': sum(d['amount_due'] for d in defaulters),
        'defaulters': defaulters
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_wise_collection(request):
    """Get collection analytics by class"""
    academic_year = request.query_params.get('academic_year', '2026-2027')
    
    class_data = Invoice.objects.filter(
        student__current_class__isnull=False
    ).values(
        'student__current_class__name'
    ).annotate(
        total_invoices=Count('id'),
        total_amount=Sum('amount'),
        total_paid=Sum('paid_amount'),
        avg_paid=Avg('paid_amount'),
        avg_amount=Avg('amount')
    ).order_by('student__current_class__name')
    
    result = []
    for data in class_data:
        avg_amount = data['avg_amount'] or 0
        collection_rate = 0
        if avg_amount > 0:
            collection_rate = (data['avg_paid'] or 0) / avg_amount * 100
        
        result.append({
            'class_name': data['student__current_class__name'],
            'total_invoices': data['total_invoices'],
            'total_amount': float(data['total_amount'] or 0),
            'total_paid': float(data['total_paid'] or 0),
            'collection_rate': round(collection_rate, 1)
        })
    
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_forecast(request):
    """Basic financial forecasting based on historical data"""
    months_ahead = request.query_params.get('months', 6)
    try:
        months_ahead = int(months_ahead)
    except ValueError:
        months_ahead = 6
    
    # Get last 6 months of data for forecasting
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=180)
    
    monthly_revenue = []
    current_date = start_date
    while current_date <= end_date:
        month_start = current_date.replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        revenue = Payment.objects.filter(
            payment_date__gte=month_start,
            payment_date__lte=month_end
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        monthly_revenue.append(float(revenue))
        current_date = month_end + timedelta(days=1)
    
    # Simple moving average forecast
    if len(monthly_revenue) >= 3:
        avg_growth = sum(monthly_revenue[-3:]) / 3
        forecast = []
        last_value = monthly_revenue[-1]
        
        for i in range(months_ahead):
            forecast_value = max(
                last_value,
                avg_growth
            )
            forecast.append({
                'month': (end_date + timedelta(days=30*(i+1))).strftime('%Y-%m'),
                'forecasted_revenue': round(forecast_value, 2)
            })
            last_value = forecast_value
    else:
        forecast = []
    
    return Response({
        'historical_months': len(monthly_revenue),
        'average_monthly_revenue': round(sum(monthly_revenue) / len(monthly_revenue), 2) if monthly_revenue else 0,
        'forecast': forecast
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_installment_invoice(request, invoice_id):
    """Create installment invoices from a parent invoice"""
    try:
        invoice = Invoice.objects.get(id=invoice_id)
        
        if not invoice.installment_plan:
            return Response({'error': 'Invoice does not have an installment plan'}, status=400)
        
        if invoice.is_installment:
            return Response({'error': 'This is already an installment invoice'}, status=400)
        
        invoice.create_installments()

        # Immediately sync overdue child installments with defaulter logic
        child_installments = Invoice.objects.filter(
            parent_invoice=invoice,
            due_date__lt=timezone.now().date(),
            status__in=['issued', 'partial']
        )

        if child_installments.exists():
            child_installments.update(status='overdue')
            invoice.status = 'overdue'
            invoice.save(update_fields=['status'])

        return Response({'message': 'Installment invoices created successfully'})
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_scholarship_to_invoice(request, invoice_id):
    """Apply scholarship discount to an invoice"""
    try:
        invoice = Invoice.objects.get(id=invoice_id)
        scholarship_id = request.data.get('scholarship_id')
        
        if not scholarship_id:
            return Response({'error': 'Scholarship ID required'}, status=400)
        
        scholarship = StudentScholarship.objects.get(id=scholarship_id)
        invoice.scholarship = scholarship
        invoice.apply_scholarship_discount()
        invoice.save()
        
        return Response({'message': 'Scholarship applied successfully'})
    except (Invoice.DoesNotExist, StudentScholarship.DoesNotExist):
        return Response({'error': 'Invoice or scholarship not found'}, status=404)


# Email Communication Functions

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_fee_reminder(request, invoice_id):
    """Send fee payment reminder email"""
    try:
        invoice = Invoice.objects.select_related('student').get(id=invoice_id)
        
        if not invoice.student.email:
            return Response({'error': 'Student email not available'}, status=400)
        
        days_overdue = 0
        if invoice.due_date < timezone.now().date():
            days_overdue = (timezone.now().date() - invoice.due_date).days
        
        # Prepare email context
        context = {
            'student_name': invoice.student.full_name,
            'school_name': getattr(settings, 'SCHOOL_NAME', 'School Management System'),
            'school_address': getattr(settings, 'SCHOOL_ADDRESS', ''),
            'invoice_number': invoice.invoice_number,
            'due_date': invoice.due_date,
            'amount_due': float(invoice.balance_due),
            'days_overdue': days_overdue,
        }
        
        # Render HTML email
        html_content = render_to_string('finance/emails/fee_reminder.html', context)
        text_content = strip_tags(html_content)
        
        # Send email
        subject = f"Fee Payment Reminder - {invoice.invoice_number}"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@school.com')
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[invoice.student.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        # Log the communication
        TransactionLog.objects.create(
            model_name='Invoice',
            object_id=invoice.id,
            action='email_reminder_sent',
            user=request.user,
            details=f"Fee reminder sent to {invoice.student.email} for invoice {invoice.invoice_number}",
            old_value={},
            new_value={'email_sent': True}
        )
        
        return Response({
            'message': 'Fee reminder sent successfully',
            'recipient': invoice.student.email,
            'invoice_number': invoice.invoice_number
        })
        
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': f'Failed to send email: {str(e)}'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_payment_confirmation(request, payment_id):
    """Send payment confirmation email"""
    try:
        payment = Payment.objects.select_related('invoice__student').get(id=payment_id)
        
        if not payment.invoice.student.email:
            return Response({'error': 'Student email not available'}, status=400)
        
        # Prepare email context
        context = {
            'student_name': payment.invoice.student.full_name,
            'school_name': getattr(settings, 'SCHOOL_NAME', 'School Management System'),
            'school_address': getattr(settings, 'SCHOOL_ADDRESS', ''),
            'receipt_number': f"RCP-{payment.id:06d}",
            'payment_date': payment.payment_date,
            'invoice_number': payment.invoice.invoice_number,
            'payment_method': payment.get_payment_method_display(),
            'transaction_id': payment.transaction_id,
            'amount': float(payment.amount),
            'remaining_balance': float(payment.invoice.balance_due),
        }
        
        # Render HTML email
        html_content = render_to_string('finance/emails/payment_confirmation.html', context)
        text_content = strip_tags(html_content)
        
        # Send email
        subject = f"Payment Confirmation - Receipt #{context['receipt_number']}"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@school.com')
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[payment.invoice.student.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        # Log the communication
        TransactionLog.objects.create(
            model_name='Payment',
            object_id=payment.id,
            action='email_confirmation_sent',
            user=request.user,
            details=f"Payment confirmation sent to {payment.invoice.student.email} for payment {payment.id}",
            old_value={},
            new_value={'email_sent': True}
        )
        
        return Response({
            'message': 'Payment confirmation sent successfully',
            'recipient': payment.invoice.student.email,
            'receipt_number': context['receipt_number']
        })
        
    except Payment.DoesNotExist:
        return Response({'error': 'Payment not found'}, status=404)
    except Exception as e:
        return Response({'error': f'Failed to send email: {str(e)}'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_defaulter_notice(request, invoice_id):
    """Send defaulter notice email"""
    try:
        invoice = Invoice.objects.select_related('student').get(id=invoice_id)
        
        if not invoice.student.email:
            return Response({'error': 'Student email not available'}, status=400)
        
        if invoice.status != 'overdue':
            return Response({'error': 'Invoice is not overdue'}, status=400)
        
        days_overdue = (timezone.now().date() - invoice.due_date).days
        
        # Prepare email context
        context = {
            'student_name': invoice.student.full_name,
            'school_name': getattr(settings, 'SCHOOL_NAME', 'School Management System'),
            'school_address': getattr(settings, 'SCHOOL_ADDRESS', ''),
            'invoice_number': invoice.invoice_number,
            'due_date': invoice.due_date,
            'days_overdue': days_overdue,
            'late_fee_amount': float(invoice.late_fee_amount),
            'total_amount_due': float(invoice.balance_due),
            'finance_contact': getattr(settings, 'FINANCE_CONTACT', 'Finance Department'),
            'finance_phone': getattr(settings, 'FINANCE_PHONE', ''),
            'finance_email': getattr(settings, 'FINANCE_EMAIL', ''),
        }
        
        # Render HTML email
        html_content = render_to_string('finance/emails/defaulter_notice.html', context)
        text_content = strip_tags(html_content)
        
        # Send email
        subject = f"URGENT: Overdue Payment Notice - {invoice.invoice_number}"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@school.com')
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[invoice.student.email]  # Fixed: was invoice.invoice.student.email
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        # Log the communication
        TransactionLog.objects.create(
            model_name='Invoice',
            object_id=invoice.id,
            action='defaulter_notice_sent',
            user=request.user,
            details=f"Defaulter notice sent to {invoice.student.email} for invoice {invoice.invoice_number}",
            old_value={},
            new_value={'notice_sent': True}
        )
        
        return Response({
            'message': 'Defaulter notice sent successfully',
            'recipient': invoice.student.email,
            'invoice_number': invoice.invoice_number,
            'days_overdue': days_overdue
        })
        
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': f'Failed to send email: {str(e)}'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_defaulter_whatsapp_notice(request, invoice_id):
    """Send defaulter notice via WhatsApp message"""
    try:
        invoice = Invoice.objects.select_related('student').get(id=invoice_id)

        if invoice.status != 'overdue':
            return Response({'error': 'Invoice is not overdue'}, status=400)

        if not invoice.student.phone:
            return Response({'error': 'Student phone not available'}, status=400)

        Message = apps.get_model('education_communication', 'Message')
        MessageTemplate = apps.get_model('education_communication', 'MessageTemplate')

        template = MessageTemplate.objects.filter(template_type='defaulter_notice', is_active=True).first()
        if template:
            message_text = template.render({
                'student_name': invoice.student.full_name,
                'invoice_number': invoice.invoice_number,
                'due_date': invoice.due_date,
                'amount_due': float(invoice.balance_due),
                'days_overdue': (timezone.now().date() - invoice.due_date).days,
            })
        else:
            message_text = (
                f"Dear {invoice.student.full_name}, your invoice {invoice.invoice_number} is overdue. "
                f"Amount due: {float(invoice.balance_due)}. Please pay immediately."
            )

        whatsapp_message = Message.objects.create(
            sender='School ERP',
            recipient=invoice.student.full_name,
            recipient_phone=invoice.student.phone,
            subject=f'Overdue Payment Reminder - {invoice.invoice_number}',
            message=message_text,
            template_name='fee_reminder',
            channel='whatsapp',
            is_delivered=False,
            tenant_id=getattr(request.user, 'tenant_id', '') if getattr(request.user, 'tenant_id', None) else ''
        )
        # WhatsApp disabled for this tenant

        TransactionLog.objects.create(
            model_name='Invoice',
            object_id=invoice.id,
            action='defaulter_whatsapp_notice_queued',
            user=request.user,
            details=f"WhatsApp defaulter notice queued for {invoice.student.phone} on invoice {invoice.invoice_number}",
            old_value={},
            new_value={'notice_channel': 'whatsapp', 'message_id': str(whatsapp_message.id)}
        )

        return Response({
            'message': 'WhatsApp defaulter notice queued successfully',
            'recipient_phone': invoice.student.phone,
            'invoice_number': invoice.invoice_number
        })

    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': f'Failed to queue WhatsApp notice: {str(e)}'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_send_reminders(request):
    """Send bulk fee reminders to students with unpaid invoices this month."""
    from django.utils import timezone
    from django.core.mail import EmailMultiAlternatives
    from django.template.loader import render_to_string
    from django.utils.html import strip_tags
    from django.conf import settings

    today = timezone.localtime().date()
    invoice_month = today.replace(day=1)

    # Optional: filter by specific invoice IDs or send to all unpaid this month
    invoice_ids = request.data.get("invoice_ids", [])

    if invoice_ids:
        invoices = Invoice.objects.filter(
            id__in=invoice_ids,
            status__in=['issued', 'partial', 'overdue'],
        ).select_related('student')
    else:
        invoices = Invoice.objects.filter(
            invoice_month=invoice_month,
            status__in=['issued', 'partial'],
        ).select_related('student')

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@school.com')
    school_name = getattr(settings, 'SCHOOL_NAME', 'School Management System')

    sent_count = 0
    skipped_count = 0
    errors = []

    for invoice in invoices:
        student = invoice.student
        if not student.email:
            skipped_count += 1
            continue

        days_overdue = max(0, (today - invoice.due_date).days)
        context = {
            'student_name': student.full_name,
            'school_name': school_name,
            'invoice_number': invoice.invoice_number,
            'due_date': invoice.due_date,
            'amount': float(invoice.amount),
            'opening_balance': float(invoice.opening_balance),
            'late_fee_amount': float(invoice.late_fee_amount),
            'balance_due': float(invoice.balance_due),
            'days_overdue': days_overdue,
        }

        try:
            html_content = render_to_string('finance/emails/fee_reminder.html', context)
            text_content = strip_tags(html_content)
            email_msg = EmailMultiAlternatives(
                subject=f"Fee Reminder — {invoice.invoice_number}",
                body=text_content,
                from_email=from_email,
                to=[student.email],
            )
            email_msg.attach_alternative(html_content, "text/html")
            email_msg.send()
            sent_count += 1
        except Exception as exc:
            errors.append({'invoice': invoice.invoice_number, 'error': str(exc)})

    return Response({
        'success': True,
        'sent': sent_count,
        'skipped_no_email': skipped_count,
        'errors': errors,
        'message': f'Sent {sent_count} reminders successfully.',
    })


# ─── Admin Trigger Endpoints ─────────────────────────────────────────────────
# These endpoints allow admin to manually trigger scheduled jobs from the UI.

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_monthly_invoices(request):
    """Admin trigger: Generate this month's invoices (same as 1st-of-month cron)."""
    from django.core.management import call_command
    from io import StringIO

    out = StringIO()
    try:
        call_command('generate_monthly_invoices', '--force', stdout=out, verbosity=1)
        output = out.getvalue()
        return Response({
            'success': True,
            'message': 'Monthly invoices generated.',
            'details': output,
        })
    except Exception as exc:
        return Response({'success': False, 'error': str(exc)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_apply_late_fees(request):
    """Admin trigger: Apply late fees to overdue invoices (same as 10th-of-month cron)."""
    from django.core.management import call_command
    from io import StringIO

    out = StringIO()
    try:
        call_command('apply_late_fees', '--force', stdout=out, verbosity=1)
        output = out.getvalue()
        return Response({
            'success': True,
            'message': 'Late fees applied.',
            'details': output,
        })
    except Exception as exc:
        return Response({'success': False, 'error': str(exc)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_send_reminders(request):
    """Admin trigger: Send fee reminders (same as 5th-of-month cron)."""
    from django.core.management import call_command
    from io import StringIO

    out = StringIO()
    try:
        call_command('send_fee_reminders', '--force', stdout=out, verbosity=1)
        output = out.getvalue()
        return Response({
            'success': True,
            'message': 'Fee reminders sent.',
            'details': output,
        })
    except Exception as exc:
        return Response({'success': False, 'error': str(exc)}, status=500)


class FinanceSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = FinanceSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj, _ = FinanceSettings.objects.get_or_create(
            id='00000000-0000-0000-0000-000000000001'
        )
        return obj
