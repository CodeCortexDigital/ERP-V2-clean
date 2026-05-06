from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from .models import FeeStructure, Invoice, Payment
from .serializers import FeeStructureSerializer, InvoiceSerializer, PaymentSerializer
from django.apps import apps

Student = apps.get_model('education_students', 'Student')


class FeeStructureListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer


class FeeStructureDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    lookup_field = 'id'


class InvoiceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InvoiceSerializer
    
    def get_queryset(self):
        queryset = Invoice.objects.select_related('student')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by('-due_date')


class InvoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    lookup_field = 'id'


class PaymentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer
    
    def get_queryset(self):
        queryset = Payment.objects.select_related('invoice')
        invoice_id = self.request.query_params.get('invoice')
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)
        return queryset.order_by('-payment_date')


class PaymentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    lookup_field = 'id'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance_summary(request):
    """Get finance summary for dashboard"""
    total_invoices = Invoice.objects.count()
    total_amount = Invoice.objects.aggregate(total=Sum('amount'))['total'] or 0
    total_paid = Invoice.objects.aggregate(total=Sum('paid_amount'))['total'] or 0
    balance_due = total_amount - total_paid
    collection_rate = round((total_paid / total_amount * 100), 1) if total_amount > 0 else 0
    
    return Response({
        'total_invoices': total_invoices,
        'total_amount': float(total_amount),
        'total_paid': float(total_paid),
        'balance_due': float(balance_due),
        'collection_rate': collection_rate
    })
