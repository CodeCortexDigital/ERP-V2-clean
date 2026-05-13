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
        elements.append(Paragraph("CODE CORTEX SCHOOL", self.title_style))
        elements.append(Paragraph("Excellence in Education", self.normal_style))
        elements.append(Spacer(1, 20))
        
        # Receipt Info
        receipt_info = [
            ["Receipt Date:", datetime.now().strftime('%d-%b-%Y')],
            ["Receipt No:", f"INV-{invoice.invoice_number if hasattr(invoice, 'invoice_number') else invoice.id[:8]}"]
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
            ["Student Name:", student.full_name],
            ["Student ID:", student.student_id],
            ["Class:", student.current_class.name if student.current_class else "N/A"],
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
        fee_data = [["Description", "Amount (₹)", "Status"]]
        fee_data.append(["Tuition Fee", "5,000", "Paid"])
        fee_data.append(["Admission Fee", "2,000", "Paid"])
        fee_data.append(["Exam Fee", "500", "Paid"])
        fee_data.append(["Total", "7,500", ""])
        
        fee_table = Table(fee_data, colWidths=[200, 150, 130])
        fee_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('GRID', (0,0), (-1,-2), 0.5, colors.grey),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#f0f4f8')),
        ]))
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
