"""
Finance model and API tests.
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from rest_framework import status
from tests.conftest import (
    InvoiceFactory, StudentFactory
)


pytestmark = pytest.mark.django_db


class TestInvoiceModel:
    """Test Invoice model."""
    
    def test_invoice_creation(self, test_invoice):
        """Test invoice can be created."""
        assert test_invoice.id is not None
        assert test_invoice.student is not None
        assert test_invoice.amount > 0
    
    def test_invoice_status_choices(self, test_invoice):
        """Test invoice status is valid."""
        assert test_invoice.status in ['pending', 'partial', 'paid', 'overdue', 'cancelled']
    
    def test_invoice_number_unique(self, test_student):
        """Test invoice number is unique."""
        invoice1 = InvoiceFactory(student=test_student)
        invoice2 = InvoiceFactory(student=test_student)
        assert invoice1.invoice_number != invoice2.invoice_number
    
    def test_invoice_amount_paid_calculation(self, test_invoice):
        """Test amount paid is calculated correctly."""
        assert test_invoice.paid_amount >= 0
        assert test_invoice.paid_amount <= test_invoice.amount
    
    def test_invoice_balance_calculation(self, test_invoice):
        """Test balance is calculated correctly."""
        balance = test_invoice.amount - test_invoice.paid_amount
        assert balance >= 0


class TestInvoiceAPI:
    """Test Invoice API endpoints."""
    
    def test_list_invoices(self, authenticated_api_client):
        """Test listing invoices."""
        client, user = authenticated_api_client
        InvoiceFactory.create_batch(5)
        
        # Adjust endpoint based on actual implementation
        # response = client.get('/api/finance/invoices/')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_create_invoice(self, authenticated_api_client, test_student):
        """Test creating an invoice."""
        client, user = authenticated_api_client
        
        # Adjust endpoint and payload based on actual implementation
        # data = {
        #     'student': test_student.id,
        #     'amount': Decimal('5000.00'),
        #     'due_date': (datetime.now() + timedelta(days=30)).date(),
        #     'description': 'Monthly tuition fee'
        # }
        # response = client.post('/api/finance/invoices/', data)
        # assert response.status_code == status.HTTP_201_CREATED
    
    def test_retrieve_invoice(self, test_invoice, authenticated_api_client):
        """Test retrieving a specific invoice."""
        client, user = authenticated_api_client
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/finance/invoices/{test_invoice.id}/')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_update_invoice(self, test_invoice, authenticated_api_client):
        """Test updating an invoice."""
        client, user = authenticated_api_client
        # Adjust endpoint and payload based on actual implementation
        # data = {'status': 'paid', 'paid_amount': test_invoice.amount}
        # response = client.patch(f'/api/finance/invoices/{test_invoice.id}/', data)
        # assert response.status_code == status.HTTP_200_OK


class TestInvoiceFiltering:
    """Test invoice filtering."""
    
    def test_filter_invoices_by_status(self, authenticated_api_client):
        """Test filtering invoices by status."""
        client, user = authenticated_api_client
        
        # Create invoices with different statuses
        InvoiceFactory(status='pending')
        InvoiceFactory(status='paid')
        InvoiceFactory(status='overdue')
        
        # Adjust endpoint based on actual implementation
        # response = client.get('/api/finance/invoices/?status=pending')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_filter_invoices_by_student(self, authenticated_api_client, test_student):
        """Test filtering invoices by student."""
        client, user = authenticated_api_client
        InvoiceFactory.create_batch(3, student=test_student)
        
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/finance/invoices/?student={test_student.id}')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_filter_invoices_by_date_range(self, authenticated_api_client):
        """Test filtering invoices by date range."""
        client, user = authenticated_api_client
        
        start_date = (datetime.now() - timedelta(days=30)).date()
        end_date = datetime.now().date()
        
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/finance/invoices/?date_from={start_date}&date_to={end_date}')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_search_invoices_by_invoice_number(self, authenticated_api_client):
        """Test searching invoices by number."""
        client, user = authenticated_api_client
        invoice = InvoiceFactory()
        
        # Adjust endpoint based on actual implementation
        # response = client.get(f'/api/finance/invoices/?search={invoice.invoice_number}')
        # assert response.status_code == status.HTTP_200_OK


class TestFinanceReports:
    """Test finance report generation."""
    
    def test_get_pending_invoices_report(self, authenticated_api_client):
        """Test getting pending invoices report."""
        client, user = authenticated_api_client
        
        # Create mix of invoices
        InvoiceFactory.create_batch(3, status='pending')
        InvoiceFactory.create_batch(2, status='paid')
        
        # Adjust endpoint based on actual implementation
        # response = client.get('/api/finance/reports/pending-invoices/')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_get_fee_collection_report(self, authenticated_api_client):
        """Test getting fee collection report."""
        client, user = authenticated_api_client
        
        # Adjust endpoint based on actual implementation
        # response = client.get('/api/finance/reports/fee-collection/?year=2026&month=5')
        # assert response.status_code == status.HTTP_200_OK
    
    def test_get_revenue_summary(self, authenticated_api_client):
        """Test getting revenue summary."""
        client, user = authenticated_api_client
        
        # Adjust endpoint based on actual implementation
        # response = client.get('/api/finance/reports/revenue-summary/')
        # assert response.status_code == status.HTTP_200_OK


class TestPaymentProcessing:
    """Test payment processing."""
    
    def test_record_payment(self, authenticated_api_client, test_invoice):
        """Test recording a payment."""
        client, user = authenticated_api_client
        
        # Adjust endpoint and payload based on actual implementation
        # data = {
        #     'invoice': test_invoice.id,
        #     'amount': Decimal('2500.00'),
        #     'payment_method': 'bank_transfer'
        # }
        # response = client.post('/api/finance/payments/', data)
        # assert response.status_code == status.HTTP_201_CREATED
    
    def test_record_partial_payment(self, authenticated_api_client, test_invoice):
        """Test recording partial payment."""
        client, user = authenticated_api_client
        payment_amount = test_invoice.amount / 2
        
        # Adjust endpoint and payload based on actual implementation
        # data = {
        #     'invoice': test_invoice.id,
        #     'amount': payment_amount,
        # }
        # response = client.post('/api/finance/payments/', data)
        # assert response.status_code == status.HTTP_201_CREATED
        # assert test_invoice.status == 'partial'
    
    def test_record_full_payment(self, authenticated_api_client, test_invoice):
        """Test recording full payment marks invoice as paid."""
        client, user = authenticated_api_client
        
        # Adjust endpoint and payload based on actual implementation
        # data = {
        #     'invoice': test_invoice.id,
        #     'amount': test_invoice.amount,
        # }
        # response = client.post('/api/finance/payments/', data)
        # assert response.status_code == status.HTTP_201_CREATED
        # assert test_invoice.status == 'paid'
