import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from datetime import date, timedelta
from django.apps import apps
from django.db import transaction

def calculate_student_features(student, attendance_records) -> dict:
    total = len(attendance_records)
    if total == 0:
        return {
            "absence_rate": 0.0,
            "late_rate": 0.0,
            "max_streak": 0,
            "monday_absence_rate": 0.0
        }
        
    absents = [r for r in attendance_records if r.status == 'absent']
    lates = [r for r in attendance_records if r.status == 'late']
    
    absence_rate = len(absents) / total
    late_rate = len(lates) / total
    
    # Calculate streak
    sorted_records = sorted(attendance_records, key=lambda x: x.date)
    max_streak = 0
    current_streak = 0
    for r in sorted_records:
        if r.status == 'absent':
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 0
            
    # Monday absence rate
    mondays = [r for r in attendance_records if r.date.weekday() == 0]
    monday_absents = [r for r in mondays if r.status == 'absent']
    monday_absence_rate = len(monday_absents) / len(mondays) if mondays else 0.0
    
    return {
        "absence_rate": absence_rate,
        "late_rate": late_rate,
        "max_streak": max_streak,
        "monday_absence_rate": monday_absence_rate
    }

def detect_anomalies() -> list:
    Student = apps.get_model('education_students', 'Student')
    AttendanceRecord = apps.get_model('education_attendance', 'AttendanceRecord')
    AttendancePattern = apps.get_model('education_attendance', 'AttendancePattern')
    AttendanceAlert = apps.get_model('education_attendance', 'AttendanceAlert')
    
    students = Student.objects.filter(is_active=True)
    if not students.exists():
        return []
        
    data = []
    student_map = {}
    today = date.today()
    start_date = today - timedelta(days=90)
    
    for student in students:
        records = list(AttendanceRecord.objects.filter(student=student, date__gte=start_date))
        if len(records) >= 3:  # Only analyze students with at least 3 attendance events
            features = calculate_student_features(student, records)
            features["student_id"] = student.id
            data.append(features)
            student_map[student.id] = (student, features)
            
    if len(data) < 3:
        # Fallback to rule-based anomaly detection if we don't have enough samples for IsolationForest
        print("Insufficient students for Isolation Forest. Running rule-based outlier checks.")
        anomalies_detected = []
        for student_id, (student, features) in student_map.items():
            if features["absence_rate"] > 0.25 or features["max_streak"] >= 3 or features["late_rate"] > 0.20:
                anomalies_detected.append(student_id)
    else:
        # Train Isolation Forest
        df = pd.DataFrame(data)
        X = df[["absence_rate", "late_rate", "max_streak", "monday_absence_rate"]]
        
        # Fit model (contamination = 15% rate of outliers)
        clf = IsolationForest(contamination=0.15, random_state=42)
        preds = clf.fit_predict(X)
        
        # -1 indicates outlier/anomaly
        anomalies_detected = df[preds == -1]["student_id"].tolist()
        
    alerts_created = []
    
    # Save anomalies to DB using atomic transaction
    with transaction.atomic():
        # Deactivate old patterns/alerts to avoid duplicates
        AttendancePattern.objects.filter(is_active=True).update(is_active=False)
        AttendanceAlert.objects.filter(is_resolved=False).update(is_resolved=True)
        
        for student_id in anomalies_detected:
            student, features = student_map[student_id]
            
            # Determine main pattern type
            if features["max_streak"] >= 3:
                p_type = 'consecutive'
                desc = f"Consecutive absences streak detected. Longest absence run: {features['max_streak']} days."
                a_type = 'consecutive_absent'
                severity = 'high'
            elif features["monday_absence_rate"] >= 0.4:
                p_type = 'weekday'
                desc = f"High Monday absence rate of {int(features['monday_absence_rate']*100)}% detected."
                a_type = 'weekday_pattern'
                severity = 'medium'
            elif features["absence_rate"] > 0.2:
                p_type = 'declining'
                desc = f"Declining attendance with overall absence rate of {int(features['absence_rate']*100)}%."
                a_type = 'declining'
                severity = 'high'
            else:
                p_type = 'inconsistent'
                desc = f"Inconsistent attendance pattern (Late: {int(features['late_rate']*100)}%, Absent: {int(features['absence_rate']*100)}%)."
                a_type = 'low_attendance'
                severity = 'low'
                
            # Create pattern
            pattern = AttendancePattern.objects.create(
                student=student,
                pattern_type=p_type,
                description=desc,
                severity=severity,
                start_date=start_date,
                end_date=today,
                confidence_score=0.85,
                affected_days=int(features["absence_rate"] * 90),
                is_active=True
            )
            
            # Create alert
            alert = AttendanceAlert.objects.create(
                student=student,
                pattern=pattern,
                alert_type=a_type,
                title=f"AI Alert: {pattern.get_pattern_type_display()}",
                message=desc,
                priority='high' if severity in ('high', 'critical') else 'medium',
                is_resolved=False
            )
            
            alerts_created.append({
                "student_name": student.full_name,
                "class_name": student.current_class.name if student.current_class else "No Class",
                "alert_type": a_type,
                "description": desc,
                "severity": severity
            })
            
    return alerts_created
