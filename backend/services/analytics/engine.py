from django.apps import apps
from django.db.models import Avg, Count, Sum, Q
from decimal import Decimal

class InsightsEngine:
    """Calculate student insights, risks, and recommendations"""
    
    def __init__(self, student):
        self.student = student
        self.attendance_data = None
        self.exam_data = None
        self.finance_data = None
        
    def calculate_risk_score(self):
        """Calculate comprehensive risk score (0-100)"""
        self._load_data()
        
        score = 0
        factors = {}
        
        # 1. Attendance Risk (40% weight)
        if self.attendance_data and self.attendance_data.get('total', 0) > 0:
            attendance_rate = self.attendance_data.get('rate', 100)
            if attendance_rate < 70:
                score += 40
                factors['attendance'] = f"Low attendance: {attendance_rate}%"
            elif attendance_rate < 80:
                score += 20
                factors['attendance'] = f"Moderate attendance: {attendance_rate}%"
            else:
                factors['attendance'] = f"Good attendance: {attendance_rate}%"
        
        # 2. Academic Performance Risk (40% weight)
        if self.exam_data and self.exam_data.get('total', 0) > 0:
            avg_percentage = self.exam_data.get('avg_percentage', 100)
            if avg_percentage < 50:
                score += 40
                factors['academic'] = f"Poor performance: {avg_percentage}% average"
            elif avg_percentage < 65:
                score += 20
                factors['academic'] = f"Below average: {avg_percentage}% average"
            else:
                factors['academic'] = f"Good performance: {avg_percentage}% average"
        
        # 3. Financial Risk (20% weight)
        if self.finance_data:
            balance = self.finance_data.get('balance_due', 0)
            if balance > 50000:
                score += 20
                factors['financial'] = f"High fee balance: {balance}"
            elif balance > 20000:
                score += 10
                factors['financial'] = f"Moderate fee balance: {balance}"
        
        # Determine risk level
        if score >= 70:
            risk_level = 'critical'
        elif score >= 50:
            risk_level = 'high'
        elif score >= 30:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        return {
            'score': score,
            'level': risk_level,
            'factors': factors
        }
    
    def generate_recommendations(self, risk_data):
        """Generate recommendations based on risk factors"""
        recommendations = []
        
        for factor, description in risk_data.get('factors', {}).items():
            if factor == 'attendance':
                recommendations.append({
                    'type': 'attendance',
                    'title': 'Improve Attendance',
                    'description': description,
                    'action': 'Schedule parent meeting to discuss attendance'
                })
            elif factor == 'academic':
                recommendations.append({
                    'type': 'academic',
                    'title': 'Academic Support Needed',
                    'description': description,
                    'action': 'Assign additional tutoring sessions'
                })
            elif factor == 'financial':
                recommendations.append({
                    'type': 'financial',
                    'title': 'Fee Assistance Required',
                    'description': description,
                    'action': 'Contact finance department for payment plan'
                })
        
        return recommendations
    
    def predict_performance(self):
        """Predict student academic performance"""
        self._load_data()
        
        if self.exam_data and self.exam_data.get('total', 0) > 0:
            avg = self.exam_data.get('avg_percentage', 0)
            
            if avg >= 80:
                predicted = 'A+'
            elif avg >= 70:
                predicted = 'A'
            elif avg >= 60:
                predicted = 'B'
            elif avg >= 50:
                predicted = 'C'
            else:
                predicted = 'D'
            
            return {
                'predicted_grade': predicted,
                'confidence': min(95, 60 + (avg / 2)),
                'avg_percentage': avg
            }
        
        return {'predicted_grade': 'N/A', 'confidence': 0, 'avg_percentage': 0}
    
    def _load_data(self):
        """Load data from all modules"""
        Student = apps.get_model('education_students', 'Student')
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        ExamResult = apps.get_model('education_exams', 'ExamResult')
        Invoice = apps.get_model('education_finance', 'Invoice')
        
        # Attendance
        attendance_records = Attendance.objects.filter(student=self.student)
        total = attendance_records.count()
        present = attendance_records.filter(status='present').count()
        self.attendance_data = {
            'total': total,
            'present': present,
            'rate': round((present / total * 100), 1) if total > 0 else 100
        }
        
        # Exams
        exam_results = ExamResult.objects.filter(student=self.student)
        total_exams = exam_results.count()
        avg_percentage = exam_results.aggregate(Avg('percentage'))['percentage__avg'] or 0
        self.exam_data = {
            'total': total_exams,
            'avg_percentage': round(avg_percentage, 1),
            'passed': exam_results.filter(is_pass=True).count()
        }
        
        # Finance
        invoices = Invoice.objects.filter(student=self.student)
        total_amount = sum(float(i.amount or 0) for i in invoices)
        total_paid = sum(float(i.paid_amount or 0) for i in invoices)
        self.finance_data = {
            'total_amount': total_amount,
            'total_paid': total_paid,
            'balance_due': total_amount - total_paid
        }
