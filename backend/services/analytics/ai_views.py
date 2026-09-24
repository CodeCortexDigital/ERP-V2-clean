"""AI analytics & content endpoints (mounted under /api/v1/ai/).

ML features (risk scoring, anomaly detection, face recognition) need the
packages in ai-ml/requirements.txt; when they are not installed these
endpoints answer 503 instead of pretending to work. Lesson plans and quizzes
use the configured LLM provider (services/ai/llm).
"""
import logging
import os
import sys
import tempfile

from django.apps import apps
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from services.ai.context import AIContext
from services.ai.generation import generate_lesson_plan, generate_quiz as llm_generate_quiz
from services.ai.llm import LLMError, get_llm_client
from services.ai.permissions import HasAIRole, IsAIAdmin, IsAIEducator
from services.ai.quota import AIQuotaExceeded, check_rate_limit, check_token_budget, feature_enabled, record_usage

logger = logging.getLogger("erp.ai")

# ai-ml/ lives next to backend/ in the repo.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ai_ml_path = os.path.abspath(os.path.join(BASE_DIR, '..', 'ai-ml'))
if os.name == 'nt' and len(ai_ml_path) > 1 and ai_ml_path[1] == ':':
    ai_ml_path = ai_ml_path[0].upper() + ai_ml_path[1:]
if ai_ml_path not in sys.path:
    sys.path.append(ai_ml_path)

try:
    from attendance.anomaly_detector import detect_anomalies
    from predictions.performance_predictor import train_and_save_model, predict_student_performance
    from predictions.dropout_fee_model import train_and_save_fee_dropout_models, predict_fee_dropout_risk
    RISK_ML_AVAILABLE = True
except ImportError:
    logger.info("Risk-scoring ML packages not installed; /ai/train-models/ disabled")
    RISK_ML_AVAILABLE = False

try:
    from attendance.face_recognizer import extract_embedding_from_image, match_embeddings
    FACE_ML_AVAILABLE = True
except ImportError:
    logger.info("Face recognition packages not installed; face endpoints disabled")
    FACE_ML_AVAILABLE = False


def _unavailable(feature):
    return Response({'error': f'{feature} is not available on this server yet.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE)


def _visible_student_ids(ctx):
    """Student ids the caller may see analytics for."""
    from services.ai.tools import _self_student_ids
    Student = apps.get_model('education_students', 'Student')
    if ctx.role in ('admin', 'accountant'):
        return ctx.scope_tenant(Student.objects.all(), 'tenant').values('id')
    if ctx.role == 'teacher':
        return Student.objects.filter(current_class_id__in=ctx.teacher_class_ids).values('id')
    return _self_student_ids(ctx)


def _llm_for(request, feature):
    """(ctx, llm) for a generation request, or (None, error Response)."""
    ctx = AIContext.from_request(request)
    if not feature_enabled(feature, ctx):
        return None, Response({'error': 'This AI feature is turned off for your school.'},
                              status=status.HTTP_403_FORBIDDEN)
    llm = get_llm_client()
    if llm is None:
        return None, Response({'error': 'AI generation needs an AI provider to be configured.'},
                              status=status.HTTP_503_SERVICE_UNAVAILABLE)
    try:
        check_rate_limit(ctx, feature)
        check_token_budget(ctx)
    except AIQuotaExceeded as exc:
        return None, Response({'error': str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    return (ctx, llm), None


@api_view(['POST'])
@permission_classes([IsAIEducator])
def ai_lesson_plan(request):
    subject = str(request.data.get('subject', '')).strip()[:100]
    grade = str(request.data.get('grade', '')).strip()[:100]
    topic = str(request.data.get('topic', '')).strip()[:200]
    objectives = request.data.get('objectives', [])
    if not (subject and grade and topic):
        return Response({'error': 'subject, grade, and topic are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if isinstance(objectives, str):
        objectives = objectives.split(',')
    objectives = [str(o).strip()[:200] for o in (objectives if isinstance(objectives, list) else [])][:8]
    try:
        duration = int(request.data.get('duration_minutes', 40))
    except (TypeError, ValueError):
        duration = 40

    ready, error = _llm_for(request, 'ai_lesson_plans')
    if error:
        return error
    ctx, llm = ready
    try:
        plan, usage, model = generate_lesson_plan(
            llm, subject=subject, grade=grade, topic=topic, objectives=objectives, duration=duration)
    except LLMError:
        logger.exception("Lesson plan generation failed")
        return Response({'error': 'Lesson plan generation failed. Please try again.'},
                        status=status.HTTP_502_BAD_GATEWAY)
    record_usage(ctx, 'ai_lesson_plans', llm.provider, model, usage)
    return Response(plan, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAIAdmin])
def train_and_predict(request):
    if not RISK_ML_AVAILABLE:
        return _unavailable('AI risk scanning')
    try:
        # 1. Train Random Forest model and predict performance
        train_msg = train_and_save_model()
        perf_results = predict_student_performance()
        
        # 2. Train Logistic Regression & XGBoost for Fee Default and Dropout Risk
        train_fd_msg = train_and_save_fee_dropout_models()
        
        # 3. Run Isolation Forest anomaly checks
        anomaly_results = detect_anomalies()
        
        # 4. Save fee default and dropout scores inside StudentRisk models
        StudentRisk = apps.get_model('analytics', 'StudentRisk')
        Student = apps.get_model('education_students', 'Student')
        
        for student in Student.objects.filter(is_active=True):
            predictions = predict_fee_dropout_risk(student)
            
            # Retrieve or create student risk object to append dropout and fee default scores
            risk_obj, created = StudentRisk.objects.get_or_create(
                student=student,
                defaults={'risk_level': 'low', 'risk_score': 0.0}
            )
            factors = risk_obj.factors or {}
            factors["fee_default_risk"] = predictions["fee_default_risk"]
            factors["dropout_risk"] = predictions["dropout_risk"]
            
            # Map factors details
            if predictions["fee_default_risk"] > 50.0:
                factors["finance"] = f"High fee default risk: {predictions['fee_default_risk']:.1f}% probability."
            else:
                factors.pop("finance", None)
                
            if predictions["dropout_risk"] > 50.0:
                factors["dropout_alert"] = f"Student shows a high dropout risk of {predictions['dropout_risk']:.1f}%."
            else:
                factors.pop("dropout_alert", None)
                
            risk_obj.factors = factors
            
            # Update risk level and risk_score dynamically based on both Dropout & Fee Default risk
            max_score = max(predictions["dropout_risk"], predictions["fee_default_risk"])
            risk_obj.risk_score = max_score
            
            if predictions["dropout_risk"] > 75.0 or (predictions["dropout_risk"] > 50.0 and predictions["fee_default_risk"] > 50.0):
                risk_obj.risk_level = 'critical'
            elif predictions["dropout_risk"] > 50.0 or predictions["fee_default_risk"] > 50.0:
                risk_obj.risk_level = 'high'
            elif predictions["dropout_risk"] > 25.0 or predictions["fee_default_risk"] > 25.0:
                risk_obj.risk_level = 'medium'
            else:
                risk_obj.risk_level = 'low'
                
            risk_obj.save()
        
        return Response({
            'status': 'success',
            'model_training': f"{train_msg} | {train_fd_msg}",
            'students_evaluated': len(perf_results),
            'anomalies_detected': len(anomaly_results),
            'anomalies': anomaly_results
        }, status=status.HTTP_200_OK)
    except Exception:
        logger.exception("AI model training / risk scan failed")
        return Response({'status': 'error', 'message': 'AI risk scan failed. See server logs.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([HasAIRole])
def get_student_predictions(request):
    StudentRisk = apps.get_model('analytics', 'StudentRisk')
    AcademicPrediction = apps.get_model('analytics', 'AcademicPrediction')
    
    ctx = AIContext.from_request(request)
    student_ids = _visible_student_ids(ctx)
    risks = StudentRisk.objects.filter(student_id__in=student_ids).select_related('student', 'student__current_class')
    predictions = AcademicPrediction.objects.filter(student_id__in=student_ids).select_related('student')
    
    predictions_map = {str(p.student_id): p for p in predictions}
    
    data = []
    for r in risks:
        p = predictions_map.get(str(r.student_id))
        factors = r.factors or {}
        
        fee_default_risk = factors.get("fee_default_risk")
        dropout_risk = factors.get("dropout_risk")
        
        data.append({
            'student_id': str(r.student_id),
            'student_name': r.student.full_name,
            'student_roll': r.student.student_id,
            'class_name': r.student.current_class.name if r.student.current_class_id else None,
            'risk_level': r.risk_level,
            'risk_score': float(r.risk_score),
            'factors': factors,
            'recommendations': r.recommendations,
            'predicted_grade': p.predicted_grade if p else 'N/A',
            'confidence': float(p.confidence) if p else 0.0,
            'fee_default_risk': fee_default_risk,
            'dropout_risk': dropout_risk
        })
        
    return Response(data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAIEducator])
def get_attendance_anomalies(request):
    AttendanceAlert = apps.get_model('education_attendance', 'AttendanceAlert')
    ctx = AIContext.from_request(request)
    alerts = AttendanceAlert.objects.filter(
        is_resolved=False, student_id__in=_visible_student_ids(ctx)
    ).select_related('student', 'pattern')
    
    data = []
    for a in alerts:
        data.append({
            'id': str(a.id),
            'student_id': str(a.student_id),
            'student_name': a.student.full_name,
            'alert_type': a.alert_type,
            'title': a.title,
            'message': a.message,
            'priority': a.priority,
            'created_at': a.created_at.isoformat()
        })
        
    return Response(data, status=status.HTTP_200_OK)

# --- PHASE 2 CORE VIEWS ---

@api_view(['POST'])
@permission_classes([IsAIEducator])
def face_register(request):
    if not FACE_ML_AVAILABLE:
        return _unavailable('Face recognition')
    student_id = request.data.get('student_id')
    image_file = request.FILES.get('image')
    
    if not student_id or not image_file:
        return Response({'error': 'student_id and image file are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    Student = apps.get_model('education_students', 'Student')
    StudentFaceEncoding = apps.get_model('education_attendance', 'StudentFaceEncoding')
    
    try:
        student = Student.objects.get(id=student_id)
    except (Student.DoesNotExist, ValueError):
        try:
            student = Student.objects.get(student_id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
            
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_img:
        for chunk in image_file.chunks():
            temp_img.write(chunk)
        temp_path = temp_img.name
        
    try:
        # Extract face embedding
        embedding = extract_embedding_from_image(temp_path, student.student_id)
        
        # Save to database
        face_rec, created = StudentFaceEncoding.objects.update_or_create(
            student=student,
            defaults={'encoding': embedding}
        )
        
        return Response({
            'status': 'success',
            'message': f"Face encoding successfully registered for {student.full_name}.",
            'student_id': str(student.id),
            'is_new_registration': created
        }, status=status.HTTP_200_OK)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@api_view(['POST'])
@permission_classes([IsAIEducator])
def face_attendance(request):
    if not FACE_ML_AVAILABLE:
        return _unavailable('Face recognition')
    classroom_id = request.data.get('classroom_id')
    image_file = request.FILES.get('image')
    
    if not classroom_id or not image_file:
        return Response({'error': 'classroom_id and image file are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    Classroom = apps.get_model('education_academics', 'Classroom')
    Student = apps.get_model('education_students', 'Student')
    StudentFaceEncoding = apps.get_model('education_attendance', 'StudentFaceEncoding')
    AttendanceRecord = apps.get_model('education_attendance', 'AttendanceRecord')
    AttendanceAlert = apps.get_model('education_attendance', 'AttendanceAlert')
    
    try:
        classroom = Classroom.objects.get(id=classroom_id)
    except (Classroom.DoesNotExist, ValueError):
        return Response({'error': 'Classroom not found.'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        
    # Get all active students enrolled in this classroom
    students = list(Student.objects.filter(current_class__location=classroom.name, is_active=True))
    if not students:
        # Fallback to general student base if no specific classroom enrollment mapping matches
        students = list(Student.objects.filter(is_active=True))
        
    # Save uploaded camera frame temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_img:
        for chunk in image_file.chunks():
            temp_img.write(chunk)
        temp_path = temp_img.name
        
    try:
        # Extract face embedding of the main face in the frame
        frame_embedding = extract_embedding_from_image(temp_path, "classroom_cam")
        
        # Match with all enrolled students who have registered face encodings
        registered_encodings = StudentFaceEncoding.objects.filter(student__in=students)
        
        recognized_students = []
        best_match = None
        highest_score = 0.0
        
        for reg in registered_encodings:
            score = match_embeddings(frame_embedding, reg.encoding)
            if score >= 70.0:
                recognized_students.append({
                    "student": reg.student,
                    "score": score
                })
                if score > highest_score:
                    highest_score = score
                    best_match = reg.student
                    
        # Mark attendance for the recognized students
        records_marked = []
        today = timezone.localdate()
        
        with transaction.atomic():
            for match in recognized_students:
                s = match["student"]
                record, created = AttendanceRecord.objects.update_or_create(
                    student=s,
                    date=today,
                    defaults={
                        'status': 'present',
                        'remarks': f"Face recognition verified. Match Score: {match['score']:.1f}%",
                        'marked_by': request.user if request.user.is_authenticated else None
                    }
                )
                records_marked.append({
                    "id": str(s.id),
                    "name": s.full_name,
                    "roll": s.student_id,
                    "confidence": match["score"]
                })
                
            # If no matches are found, log an unknown face alert
            unknown_faces_count = 0
            if not recognized_students:
                unknown_faces_count = 1
                # Alert teacher of unknown face presence
                AttendanceAlert.objects.create(
                    student=students[0] if students else None,
                    alert_type='irregularity',
                    title="Unknown Face Detected",
                    message=f"Classroom camera in {classroom.name} detected an unrecognized face during attendance marking.",
                    priority='medium',
                    is_resolved=False
                )
                
        return Response({
            'status': 'success',
            'classroom': classroom.name,
            'date': today.isoformat(),
            'students_recognized': records_marked,
            'unknown_faces_count': unknown_faces_count,
            'message': f"Marked {len(records_marked)} students present."
        }, status=status.HTTP_200_OK)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@api_view(['POST'])
@permission_classes([IsAIAdmin])
def generate_timetable(request):
    # Server-side optimisation is not wired up yet (docs/AI_UPGRADE_TODO.md, P3.8).
    return Response({'error': 'Server-side timetable optimisation is not available yet.'},
                    status=status.HTTP_501_NOT_IMPLEMENTED)

@api_view(['POST'])
@permission_classes([IsAIEducator])
def generate_quiz(request):
    subject_id = request.data.get('subject_id')
    topic = str(request.data.get('topic', '')).strip()[:200]
    difficulty = str(request.data.get('difficulty', 'medium')).strip().lower()
    grade = str(request.data.get('grade', '')).strip()[:100]
    try:
        count = max(1, min(int(request.data.get('count', 5)), 20))
    except (TypeError, ValueError):
        count = 5
    if difficulty not in ('easy', 'medium', 'hard'):
        difficulty = 'medium'

    Subject = apps.get_model('education_academics', 'Subject')
    Quiz = apps.get_model('education_exams', 'Quiz')
    QuizQuestion = apps.get_model('education_exams', 'QuizQuestion')

    subject = Subject.objects.filter(id=subject_id).first() if subject_id else None
    if subject is None:
        return Response({'error': 'A valid subject_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not topic:
        return Response({'error': 'topic is required.'}, status=status.HTTP_400_BAD_REQUEST)

    ready, error = _llm_for(request, 'ai_quiz')
    if error:
        return error
    ctx, llm = ready
    try:
        quiz_data, usage, model = llm_generate_quiz(
            llm, subject=subject.name, topic=topic, difficulty=difficulty, count=count, grade=grade)
    except LLMError:
        logger.exception("Quiz generation failed")
        return Response({'error': 'Quiz generation failed. Please try again.'}, status=status.HTTP_502_BAD_GATEWAY)
    record_usage(ctx, 'ai_quiz', llm.provider, model, usage)

    with transaction.atomic():
        quiz = Quiz.objects.create(subject=subject, title=quiz_data['title'][:200], topic=topic,
                                   difficulty=difficulty, is_published=False)
        questions = [
            QuizQuestion.objects.create(
                quiz=quiz, question_type=q['question_type'], question_text=q['question_text'],
                options=q['options'], correct_answer=q['correct_answer'], explanation=q['explanation'])
            for q in quiz_data['questions']
        ]
    # Saved as a draft: a teacher reviews it and then calls publish-quiz.
    return Response({
        "quiz_id": str(quiz.id),
        "title": quiz.title,
        "subject": subject.name,
        "topic": topic,
        "difficulty": difficulty,
        "is_published": False,
        "questions": [
            {"id": str(q.id), "question_type": q.question_type, "question_text": q.question_text,
             "options": q.options, "correct_answer": q.correct_answer, "explanation": q.explanation}
            for q in questions
        ],
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAIEducator])
def publish_quiz(request):
    quiz_id = request.data.get('quiz_id')
    class_id = request.data.get('class_id')
    Quiz = apps.get_model('education_exams', 'Quiz')
    Exam = apps.get_model('education_exams', 'Exam')
    SchoolClass = apps.get_model('education_academics', 'SchoolClass')

    quiz = Quiz.objects.filter(id=quiz_id).select_related('subject').first() if quiz_id else None
    if quiz is None:
        return Response({'error': 'Quiz not found.'}, status=status.HTTP_404_NOT_FOUND)
    target_class = SchoolClass.objects.filter(id=class_id).first() if class_id else None
    if target_class is None:
        return Response({'error': 'A valid class_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    ctx = AIContext.from_request(request)
    if ctx.role == 'teacher' and target_class.id not in ctx.teacher_class_ids:
        return Response({'error': 'You can only publish quizzes to your own classes.'},
                        status=status.HTTP_403_FORBIDDEN)

    try:
        with transaction.atomic():
            quiz.is_published = True
            quiz.save()
            question_count = quiz.questions.count()
            exam = Exam.objects.create(
                title=quiz.title,
                exam_type='quiz',
                class_ref=target_class,
                subject=quiz.subject,
                total_marks=question_count,
                passing_marks=(question_count + 1) // 2,
                exam_date=timezone.localdate(),
                is_published=True
            )
            quiz.exam = exam
            quiz.save(update_fields=['exam'])
        return Response({
            'status': 'success',
            'message': 'Quiz published to the class.',
            'quiz_id': str(quiz.id)
        }, status=status.HTTP_200_OK)
    except Exception:
        logger.exception("Quiz publish failed")
        return Response({'error': 'Quiz publish failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
