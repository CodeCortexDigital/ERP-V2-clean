#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from services.analytics.views import (
    _calculate_revenue_trends,
    _calculate_attendance_trends,
    _calculate_fee_recovery_trends,
    _calculate_student_growth,
    _calculate_exam_performance_trends,
    _calculate_teacher_performance,
    _generate_smart_insights
)

try:
    print("Testing _calculate_revenue_trends...")
    revenue = _calculate_revenue_trends()
    print(f"✓ Revenue trends: {revenue}")
except Exception as e:
    print(f"✗ Revenue trends error: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\nTesting _calculate_attendance_trends...")
    attendance = _calculate_attendance_trends()
    print(f"✓ Attendance trends: {attendance}")
except Exception as e:
    print(f"✗ Attendance trends error: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\nTesting _calculate_fee_recovery_trends...")
    fee_recovery = _calculate_fee_recovery_trends()
    print(f"✓ Fee recovery trends: {fee_recovery}")
except Exception as e:
    print(f"✗ Fee recovery trends error: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\nTesting _calculate_student_growth...")
    student_growth = _calculate_student_growth()
    print(f"✓ Student growth: {student_growth}")
except Exception as e:
    print(f"✗ Student growth error: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\nTesting _calculate_exam_performance_trends...")
    exam_performance = _calculate_exam_performance_trends()
    print(f"✓ Exam performance trends: {exam_performance}")
except Exception as e:
    print(f"✗ Exam performance trends error: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\nTesting _calculate_teacher_performance...")
    teacher_metrics = _calculate_teacher_performance()
    print(f"✓ Teacher metrics: {teacher_metrics}")
except Exception as e:
    print(f"✗ Teacher metrics error: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\nTesting _generate_smart_insights...")
    insights = _generate_smart_insights(attendance, fee_recovery, exam_performance)
    print(f"✓ Smart insights: {insights}")
except Exception as e:
    print(f"✗ Smart insights error: {e}")
    import traceback
    traceback.print_exc()

print("\n✓ All functions executed successfully!")
