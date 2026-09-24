from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
from django.http import HttpResponse
from datetime import datetime

class PDFGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=22,
            textColor=colors.HexColor('#1e3a5f'),
            alignment=1,
            spaceAfter=30
        )
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6
        )

    def generate_fee_receipt(self, invoice, student, payments):
        """Generate fee receipt PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        
        # School Header
        elements.append(Paragraph("My School", self.title_style))
        elements.append(Paragraph("Excellence in Education", self.normal_style))
        elements.append(Spacer(1, 20))
        
        # Receipt Info
        receipt_info = [
            ["Receipt Date:", datetime.now().strftime('%d-%b-%Y')],
            ["Receipt No:", f"{invoice.invoice_number if getattr(invoice, 'invoice_number', None) else 'INV-N/A'}"]
        ]
        
        info_table = Table(receipt_info, colWidths=[100, 380])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        # Student Details
        student_data = [
            ["Student Name:", student.full_name if student else "N/A"],
            ["Student ID:", student.student_id if student else "N/A"],
            ["Class:", student.current_class.name if (student and student.current_class) else "N/A"],
        ]
        
        student_table = Table(student_data, colWidths=[100, 380])
        student_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f0f4f8')),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ]))
        elements.append(student_table)
        elements.append(Spacer(1, 20))
        
        # Fee Details
        from services.core.tenants.localization import school_locale

        student_school = getattr(getattr(invoice, 'student', None), 'tenant', None) if invoice else None
        fee_data = [["Description", f"Amount ({school_locale(student_school)['currency']})", "Status"]]
        
        # Base Items
        if invoice and getattr(invoice, 'opening_balance', 0) > 0:
            fee_data.append(["Opening Balance (B/F)", f"{invoice.opening_balance:,.2f}", "Pending"])
            
        fee_name = invoice.fee_structure.fee_name if (invoice and invoice.fee_structure and invoice.fee_structure.fee_name) else "Monthly Tuition Fee"
        fee_amount = invoice.amount if invoice else 0
        fee_data.append([fee_name, f"{fee_amount:,.2f}", "Pending"])
        
        if invoice and getattr(invoice, 'late_fee_amount', 0) > 0:
            fee_data.append(["Late Fee", f"{invoice.late_fee_amount:,.2f}", "Applied"])
            
        if invoice and getattr(invoice, 'discount_amount', 0) > 0:
            fee_data.append(["Discount", f"-{invoice.discount_amount:,.2f}", "Applied"])
            
        # Subtotal/Total row
        total_idx = len(fee_data)
        total_amount = invoice.total_amount if invoice else 0
        fee_data.append(["Total Payable", f"{total_amount:,.2f}", ""])
        
        # Paid row
        paid_idx = len(fee_data)
        paid_amount = invoice.paid_amount if invoice else 0
        fee_data.append(["Amount Paid", f"{paid_amount:,.2f}", ""])
        
        # Balance row
        balance_idx = len(fee_data)
        balance_due = invoice.balance_due if invoice else 0
        status_label = invoice.status.capitalize() if invoice else "N/A"
        fee_data.append(["Balance Due", f"{balance_due:,.2f}", status_label])
        
        fee_table = Table(fee_data, colWidths=[220, 130, 130])
        table_styles = [
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('GRID', (0,0), (-1, total_idx - 1), 0.5, colors.grey),
            
            # Total row styling
            ('FONTNAME', (0, total_idx), (-1, total_idx), 'Helvetica-Bold'),
            ('BACKGROUND', (0, total_idx), (-1, total_idx), colors.HexColor('#f0f4f8')),
            ('LINEABOVE', (0, total_idx), (-1, total_idx), 1, colors.black),
            
            # Paid row styling
            ('FONTNAME', (0, paid_idx), (-1, paid_idx), 'Helvetica'),
            ('TEXTCOLOR', (0, paid_idx), (-1, paid_idx), colors.HexColor('#16a34a')), # green
            
            # Balance row styling
            ('FONTNAME', (0, balance_idx), (-1, balance_idx), 'Helvetica-Bold'),
            ('BACKGROUND', (0, balance_idx), (-1, balance_idx), colors.HexColor('#fef2f2') if balance_due > 0 else colors.HexColor('#f0fdf4')),
            ('LINEABOVE', (0, balance_idx), (-1, balance_idx), 1, colors.black),
        ]
        fee_table.setStyle(TableStyle(table_styles))
        
        elements.append(fee_table)
        elements.append(Spacer(1, 30))
        
        # Footer
        elements.append(Paragraph("This is a computer generated receipt. No signature required.", self.normal_style))
        elements.append(Paragraph("Thank you for your payment!", self.normal_style))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer


    def generate_result_card(self, student, exam_results, exam):
        """Generate result card PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        
        # Header
        elements.append(Paragraph("CODE CORTEX SCHOOL", self.title_style))
        elements.append(Paragraph("Annual Examination Result", self.normal_style))
        elements.append(Spacer(1, 20))
        
        # Student Info
        student_info = [
            ["Student Name:", student.full_name],
            ["Student ID:", student.student_id],
            ["Class:", student.current_class.name if student.current_class else "N/A"],
        ]
        
        info_table = Table(student_info, colWidths=[100, 380])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f0f4f8')),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        # Results Table
        result_data = [["Subject", "Max Marks", "Obtained", "Grade"]]
        result_data.append(["Mathematics", "100", "85", "A"])
        result_data.append(["English", "100", "78", "B+"])
        result_data.append(["Science", "100", "92", "A+"])
        result_data.append(["Total", "300", "255", "A"])
        
        result_table = Table(result_data, colWidths=[150, 80, 80, 100])
        result_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (1,0), (3,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#f0f4f8')),
        ]))
        elements.append(result_table)
        elements.append(Spacer(1, 20))
        
        # Percentage and Grade
        elements.append(Paragraph("Overall Percentage: 85.0%", self.normal_style))
        elements.append(Paragraph("Grade: A", self.normal_style))
        elements.append(Paragraph("Result: PASS", self.normal_style))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
