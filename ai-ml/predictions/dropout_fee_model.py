import os
import pickle
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from django.apps import apps
from django.db.models import Avg, Sum

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    from sklearn.ensemble import GradientBoostingClassifier as XGBClassifier
    XGBOOST_AVAILABLE = False

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

def get_tenant_model_paths(tenant_id: str) -> tuple:
    """Returns absolute paths for serialized pkl models based on tenant ID."""
    tenant_str = str(tenant_id) if tenant_id else "default"
    fee_path = os.path.join(CURRENT_DIR, f"fee_model_{tenant_str}.pkl")
    dropout_path = os.path.join(CURRENT_DIR, f"dropout_model_{tenant_str}.pkl")
    return fee_path, dropout_path

def get_student_predictive_features(student) -> dict:
    """Extracts features for both Fee Default and Dropout models."""
    AttendanceRecord = apps.get_model('education_attendance', 'AttendanceRecord')
    ExamResult = apps.get_model('education_exams', 'ExamResult')
    Invoice = apps.get_model('education_finance', 'Invoice')
    TeacherFeedback = apps.get_model('education_academics', 'TeacherFeedback')
    
    # 1. Attendance Rate
    att_total = AttendanceRecord.objects.filter(student=student).count()
    att_present = AttendanceRecord.objects.filter(student=student, status='present').count()
    att_rate = (att_present / att_total * 100.0) if att_total > 0 else 92.0
    
    # 2. Exam Average Percentage
    exam_avg = ExamResult.objects.filter(student=student).aggregate(Avg('percentage'))['percentage__avg'] or 78.0
    
    # 3. Unpaid Balance Ratio
    total_invoiced = float(Invoice.objects.filter(student=student).aggregate(Sum('amount'))['amount__sum'] or 0.0)
    total_paid = float(Invoice.objects.filter(student=student).aggregate(Sum('paid_amount'))['paid_amount__sum'] or 0.0)
    unpaid_ratio = (total_invoiced - total_paid) / total_invoiced if total_invoiced > 0 else 0.0
    
    # 4. Income (from metadata or fallback)
    meta = getattr(student, 'metadata', {}) or {}
    income = float(meta.get('income', 50000.0)) # Default 50k
    
    # 5. Siblings (from metadata, count identical parent, or fallback)
    siblings = int(meta.get('siblings', 1))
    
    # 6. Behavior concerns count
    behavior_concerns = TeacherFeedback.objects.filter(
        student=student, 
        feedback_type__in=['behavior', 'concern']
    ).count()
    
    return {
        "attendance_rate": float(att_rate),
        "exam_avg": float(exam_avg),
        "unpaid_ratio": float(unpaid_ratio),
        "income": float(income),
        "siblings": int(siblings),
        "behavior_concerns": int(behavior_concerns)
    }

def train_and_save_fee_dropout_models(tenant_id=None) -> str:
    """Trains Logistic Regression (Fee Default) and XGBoost (Dropout) models on synthetic & real data."""
    Student = apps.get_model('education_students', 'Student')
    students = Student.objects.filter(is_active=True)
    
    # Fetch real records features
    real_rows = []
    for s in students:
        real_rows.append(get_student_predictive_features(s))
        
    df_real = pd.DataFrame(real_rows)
    
    # Generate robust synthetic dataset for model initialization
    np.random.seed(88)
    n_samples = 200
    
    synthetic_data = {
        "attendance_rate": np.random.uniform(60.0, 100.0, n_samples),
        "exam_avg": np.random.uniform(45.0, 100.0, n_samples),
        "unpaid_ratio": np.random.uniform(0.0, 1.0, n_samples),
        "income": np.random.choice([25000.0, 45000.0, 75000.0, 120000.0], n_samples),
        "siblings": np.random.choice([0, 1, 2, 3], n_samples),
        "behavior_concerns": np.random.choice([0, 1, 2, 3, 4], n_samples, p=[0.6, 0.2, 0.1, 0.07, 0.03])
    }
    df_synth = pd.DataFrame(synthetic_data)
    
    # Compute logical targets for Fee Default (Logistic Regression Target)
    # Fee Default Risk is high if unpaid_ratio is high and income is low
    fee_targets = []
    for ur, inc, sib in zip(df_synth["unpaid_ratio"], df_synth["income"], df_synth["siblings"]):
        score = ur * 0.7 + (1.0 - inc/150000.0) * 0.3 + (sib * 0.05)
        fee_targets.append(1 if score > 0.5 else 0)
    df_synth["fee_default"] = fee_targets
    
    # Compute logical targets for Dropout Risk (XGBoost Target)
    # Dropout is high if attendance is low, exam score is low, and behavior concerns are high
    dropout_targets = []
    for att, ex, bc in zip(df_synth["attendance_rate"], df_synth["exam_avg"], df_synth["behavior_concerns"]):
        score = (1.0 - att/100.0) * 0.5 + (1.0 - ex/100.0) * 0.3 + (bc * 0.1)
        dropout_targets.append(1 if score > 0.45 else 0)
    df_synth["dropout"] = dropout_targets
    
    # Combine real and synthetic datasets
    if not df_real.empty:
        # Generate target defaults for real records
        real_fee = []
        for r in real_rows:
            score = r["unpaid_ratio"] * 0.7 + (1.0 - r["income"]/150000.0) * 0.3 + (r["siblings"] * 0.05)
            real_fee.append(1 if score > 0.5 else 0)
        df_real["fee_default"] = real_fee
        
        real_drop = []
        for r in real_rows:
            score = (1.0 - r["attendance_rate"]/100.0) * 0.5 + (1.0 - r["exam_avg"]/100.0) * 0.3 + (r["behavior_concerns"] * 0.1)
            real_drop.append(1 if score > 0.45 else 0)
        df_real["dropout"] = real_drop
        
        df_combined = pd.concat([df_real, df_synth], ignore_index=True)
    else:
        df_combined = df_synth
        
    # 1. Fit Fee Default Model (Logistic Regression)
    X_fee = df_combined[["unpaid_ratio", "income", "siblings"]]
    y_fee = df_combined["fee_default"]
    fee_model = LogisticRegression(random_state=42)
    fee_model.fit(X_fee, y_fee)
    
    # 2. Fit Dropout Model (XGBoost/Light Classifier)
    X_drop = df_combined[["attendance_rate", "exam_avg", "behavior_concerns"]]
    y_drop = df_combined["dropout"]
    
    if XGBOOST_AVAILABLE:
        # XGBoost requires numeric evaluation
        dropout_model = XGBClassifier(n_estimators=50, max_depth=3, random_state=42, eval_metric='logloss')
    else:
        dropout_model = XGBClassifier(n_estimators=50, max_depth=3, random_state=42)
        
    dropout_model.fit(X_drop, y_drop)
    
    # Save both models
    fee_path, dropout_path = get_tenant_model_paths(tenant_id)
    with open(fee_path, "wb") as f:
        pickle.dump(fee_model, f)
    with open(dropout_path, "wb") as f:
        pickle.dump(dropout_model, f)
        
    return f"Fee & Dropout models trained successfully (XGBoost: {'True' if XGBOOST_AVAILABLE else 'False Fallback'})."

def predict_fee_dropout_risk(student, tenant_id=None) -> dict:
    """Predicts Fee Default risk and Dropout risk for a given student."""
    fee_path, dropout_path = get_tenant_model_paths(tenant_id)
    
    # Ensure models exist
    if not os.path.exists(fee_path) or not os.path.exists(dropout_path):
        train_and_save_fee_dropout_models(tenant_id)
        
    with open(fee_path, "rb") as f:
        fee_model = pickle.load(f)
    with open(dropout_path, "rb") as f:
        dropout_model = pickle.load(f)
        
    features = get_student_predictive_features(student)
    
    # Predict fee default risk probability
    X_fee = pd.DataFrame([{
        "unpaid_ratio": features["unpaid_ratio"],
        "income": features["income"],
        "siblings": features["siblings"]
    }])
    fee_prob = float(fee_model.predict_proba(X_fee)[0][1]) * 100.0
    
    # Predict dropout risk probability
    X_drop = pd.DataFrame([{
        "attendance_rate": features["attendance_rate"],
        "exam_avg": features["exam_avg"],
        "behavior_concerns": features["behavior_concerns"]
    }])
    dropout_prob = float(dropout_model.predict_proba(X_drop)[0][1]) * 100.0
    
    return {
        "fee_default_risk": fee_prob,
        "dropout_risk": dropout_prob,
        "features": features
    }
