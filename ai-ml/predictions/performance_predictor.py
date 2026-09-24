import os
import pickle
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from django.apps import apps
from django.db.models import Avg, Sum
from django.db import transaction

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "performance_model.pkl")

def get_student_feature_row(student) -> dict:
    AttendanceRecord = apps.get_model('education_attendance', 'AttendanceRecord')
    ExamResult = apps.get_model('education_exams', 'ExamResult')
    Invoice = apps.get_model('education_finance', 'Invoice')
    
    # 1. Attendance Rate
    att_total = AttendanceRecord.objects.filter(student=student).count()
    att_present = AttendanceRecord.objects.filter(student=student, status='present').count()
    att_rate = (att_present / att_total * 100.0) if att_total > 0 else 90.0
    
    # 2. Exam Average
    exam_avg = ExamResult.objects.filter(student=student).aggregate(Avg('percentage'))['percentage__avg'] or 75.0
    
    # 3. Unpaid Invoices Balance
    total_invoiced = float(Invoice.objects.filter(student=student).aggregate(Sum('amount'))['amount__sum'] or 0.0)
    total_paid = float(Invoice.objects.filter(student=student).aggregate(Sum('paid_amount'))['paid_amount__sum'] or 0.0)
    balance = total_invoiced - total_paid
    
    return {
        "attendance_rate": float(att_rate),
        "exam_avg": float(exam_avg),
        "unpaid_balance": float(balance)
    }

def generate_synthetic_training_data(n_samples: int = 200) -> pd.DataFrame:
    """Generates synthetic historical student records for model training bootstrap."""
    np.random.seed(42)
    attendance = np.random.uniform(50.0, 100.0, n_samples)
    exam_scores = np.random.uniform(40.0, 100.0, n_samples)
    unpaid = np.random.choice([0.0, 15000.0, 30000.0, 60000.0], n_samples, p=[0.7, 0.15, 0.1, 0.05])
    
    # Simple rule-based targets to make the model learn meaningful associations
    targets = []
    for att, ex, un in zip(attendance, exam_scores, unpaid):
        # A Student is At Risk ('high') if exam score is low or attendance is very low
        if ex < 55.0 or att < 70.0:
            targets.append("high")
        elif ex < 70.0 or att < 80.0 or un > 40000.0:
            targets.append("medium")
        else:
            targets.append("low")
            
    return pd.DataFrame({
        "attendance_rate": attendance,
        "exam_avg": exam_scores,
        "unpaid_balance": unpaid,
        "risk_level": targets
    })

def train_and_save_model() -> str:
    # 1. Fetch real student data
    Student = apps.get_model('education_students', 'Student')
    students = Student.objects.filter(is_active=True)
    
    real_rows = []
    for s in students:
        row = get_student_feature_row(s)
        # Try to infer risk label based on real exam average
        if row["exam_avg"] < 50.0 or row["attendance_rate"] < 70.0:
            row["risk_level"] = "high"
        elif row["exam_avg"] < 65.0 or row["attendance_rate"] < 80.0:
            row["risk_level"] = "medium"
        else:
            row["risk_level"] = "low"
        real_rows.append(row)
        
    df_real = pd.DataFrame(real_rows)
    
    # 2. Combine with synthetic data to ensure robust model convergence
    df_synth = generate_synthetic_training_data(150)
    df_combined = pd.concat([df_real, df_synth], ignore_index=True)
    
    X = df_combined[["attendance_rate", "exam_avg", "unpaid_balance"]]
    y = df_combined["risk_level"]
    
    # Train Random Forest Classifier
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X, y)
    
    # Serialize model to disk
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
        
    return f"Model trained successfully on {len(df_combined)} samples (Real: {len(df_real)}, Synthetic: {len(df_synth)}) and saved to disk."

def predict_student_performance() -> list:
    # Load model
    if not os.path.exists(MODEL_PATH):
        train_and_save_model()
        
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
        
    Student = apps.get_model('education_students', 'Student')
    StudentRisk = apps.get_model('analytics', 'StudentRisk')
    AcademicPrediction = apps.get_model('analytics', 'AcademicPrediction')
    
    students = Student.objects.filter(is_active=True)
    results = []
    
    with transaction.atomic():
        # Clean old predictions to avoid redundancy
        StudentRisk.objects.all().delete()
        AcademicPrediction.objects.all().delete()
        
        for student in students:
            features = get_student_feature_row(student)
            X_pred = pd.DataFrame([features])
            
            # Predict risk level
            risk_level = model.predict(X_pred)[0]
            
            # Compute confidence/probability
            probs = model.predict_proba(X_pred)[0]
            confidence_idx = list(model.classes_).index(risk_level)
            confidence = float(probs[confidence_idx]) * 100.0
            
            # Map exam average to predicted final grade tier
            avg = features["exam_avg"]
            if avg >= 90.0:
                pred_grade = "A+"
            elif avg >= 80.0:
                pred_grade = "A"
            elif avg >= 70.0:
                pred_grade = "B"
            elif avg >= 50.0:
                pred_grade = "C"
            else:
                pred_grade = "D/F"
                
            # Create risk object
            factors = {}
            if features["attendance_rate"] < 80.0:
                factors["attendance"] = f"Poor attendance rate of {features['attendance_rate']:.1f}%."
            if features["exam_avg"] < 65.0:
                factors["academics"] = f"Low academic performance with avg score {features['exam_avg']:.1f}%."
            if features["unpaid_balance"] > 10000.0:
                factors["finance"] = f"Unpaid fees balance: Rs {features['unpaid_balance']:.2f}."
                
            recommendations = []
            if risk_level in ("high", "medium"):
                if "attendance" in factors:
                    recommendations.append("Conduct a parent-teacher meeting regarding attendance drops.")
                if "academics" in factors:
                    recommendations.append("Recommend after-school coaching classes and counseling sessions.")
                if "finance" in factors:
                    recommendations.append("Offer monthly installment plans for unpaid fee balances.")
            else:
                recommendations.append("Continue current study patterns. Academic progress is satisfactory.")
                
            StudentRisk.objects.create(
                student=student,
                risk_level=risk_level,
                risk_score=float(features["exam_avg"] * 0.4 + features["attendance_rate"] * 0.6), # Weighted composite risk index
                factors=factors,
                recommendations=recommendations,
                is_resolved=False
            )
            
            # Create academic prediction object
            AcademicPrediction.objects.create(
                student=student,
                predicted_grade=pred_grade,
                confidence=confidence,
                factors={
                    "attendance_rate": features["attendance_rate"],
                    "average_score": features["exam_avg"]
                }
            )
            
            results.append({
                "student_name": student.full_name,
                "predicted_grade": pred_grade,
                "risk_level": risk_level,
                "confidence": confidence
            })
            
    return results
