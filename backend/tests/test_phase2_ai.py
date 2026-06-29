import pytest
from django.urls import reverse
from rest_framework import status
from django.apps import apps
from django.utils import timezone
from django.contrib.auth import get_user_model
import numpy as np

import os
import sys

# Add ai-ml path dynamically
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ai_ml_path = os.path.abspath(os.path.join(BASE_DIR, "..", "ai-ml"))
if os.name == "nt" and len(ai_ml_path) > 1 and ai_ml_path[1] == ":":
    ai_ml_path = ai_ml_path[0].upper() + ai_ml_path[1:]
if ai_ml_path not in sys.path:
    sys.path.append(ai_ml_path)

from attendance.face_recognizer import get_hash_embedding, match_embeddings, extract_embedding_from_image
from predictions.dropout_fee_model import train_and_save_fee_dropout_models, predict_fee_dropout_risk
from academics.timetable_optimizer import optimize_timetable
from academics.quiz_generator import generate_ai_quiz

User = get_user_model()

@pytest.mark.django_db
class TestPhase2FaceRecognition:
    def test_hash_embedding_generation(self):
        emb1 = get_hash_embedding("student_1")
        emb2 = get_hash_embedding("student_1")
        emb3 = get_hash_embedding("student_2")
        
        assert len(emb1) == 128
        assert emb1 == emb2
        assert emb1 != emb3
        
        # Test normalization (should have magnitude close to 1)
        mag = np.linalg.norm(np.array(emb1))
        assert pytest.approx(mag, 0.001) == 1.0

    def test_embedding_matching(self):
        emb1 = get_hash_embedding("student_1")
        emb2 = get_hash_embedding("student_1")
        emb3 = get_hash_embedding("student_2")
        
        score_identical = match_embeddings(emb1, emb2)
        score_diff = match_embeddings(emb1, emb3)
        
        assert pytest.approx(score_identical, 0.01) == 100.0
        assert score_diff < 100.0

@pytest.mark.django_db
class TestPhase2PredictiveModels:
    def test_feature_extraction_and_training(self):
        # Trigger training to verify it executes successfully on synthetic data
        msg = train_and_save_fee_dropout_models()
        assert "trained successfully" in msg

    def test_risk_predictions(self):
        Student = apps.get_model('education_students', 'Student')
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        AcademicYear = apps.get_model('education_academics', 'AcademicYear')
        
        # Create mock academic entities
        year = AcademicYear.objects.create(name='2026-2027', start_date='2026-04-01', end_date='2027-03-31', is_active=True)
        cls = SchoolClass.objects.create(code='GRD-TEST', name='Test Class', academic_year=year)
        
        student = Student.objects.create(
            student_id="STU-TEST-999",
            full_name="Intervention Test Student",
            email="test_intervention@code.com",
            current_class=cls,
            is_active=True
        )
        
        risks = predict_fee_dropout_risk(student)
        assert "fee_default_risk" in risks
        assert "dropout_risk" in risks
        assert "features" in risks

@pytest.mark.django_db
class TestPhase2TimetableOptimizer:
    def test_timetable_ga(self):
        AcademicYear = apps.get_model('education_academics', 'AcademicYear')
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        Subject = apps.get_model('education_academics', 'Subject')
        ClassSubject = apps.get_model('education_academics', 'ClassSubject')
        Teacher = apps.get_model('education_academics', 'Teacher')
        Classroom = apps.get_model('education_academics', 'Classroom')
        Period = apps.get_model('education_academics', 'Period')
        TeacherSubjectAssignment = apps.get_model('education_academics', 'TeacherSubjectAssignment')
        Section = apps.get_model('education_academics', 'Section')
        
        # Create year
        year = AcademicYear.objects.create(name='2026-2027', start_date='2026-04-01', end_date='2027-03-31', is_active=True)
        
        # Create subject, class, and assignment
        subj = Subject.objects.create(code='SUBJ-001', name='English')
        cls = SchoolClass.objects.create(code='GRD-01', name='Grade 1', academic_year=year)
        sec = Section.objects.create(class_ref=cls, name='A', capacity=15)
        class_subj = ClassSubject.objects.create(class_ref=cls, subject=subj)
        
        teacher = Teacher.objects.create(
            employee_id="TCH-GA-TEST",
            full_name="GA Test Teacher",
            email="gateacher@code.com",
            phone="12345678",
            joining_date="2026-06-24"
        )
        TeacherSubjectAssignment.objects.create(teacher=teacher, class_subject=class_subj, academic_year=year)
        
        Classroom.objects.create(name="Room A", code="ROOM-A", capacity=30, is_active=True)
        Period.objects.create(academic_year=year, period_number=1, start_time="08:00:00", end_time="09:00:00", duration_minutes=60, is_break=False, is_active=True)
        
        res = optimize_timetable(year.id, generations=5, pop_size=10)
        assert res["status"] == "success"
        assert res["slots_scheduled"] > 0

@pytest.mark.django_db
class TestPhase2QuizGenerator:
    def test_quiz_llm_and_fallback(self):
        res = generate_ai_quiz("Chemistry", "Acids & Bases", "medium", 2)
        assert "questions" in res
        assert len(res["questions"]) == 2
        assert res["questions"][0]["question_type"] in ["mcq", "true_false", "short_answer"]
