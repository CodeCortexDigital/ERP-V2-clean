"""AI content generation & mounted analytics endpoints (docs/AI_UPGRADE_TODO.md, Phase 2)."""
from unittest import mock

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.ai.generation import _clean_question
from services.ai.models import AIUsage
from tests.conftest import ClassFactory, SchoolFactory, UserFactory
from tests.test_ai_platform import FakeLLM

PLAN = {
    "duration_minutes": 40, "learning_objectives": ["Define photosynthesis"],
    "materials_needed": ["Leaf samples"], "introduction": "Ask what plants eat.",
    "main_activities": ["10 min - explain", "15 min - experiment"], "group_work": "Pairs label a diagram.",
    "differentiation": "Picture cards for weaker readers.", "assessment": ["What gas is released?"],
    "homework": "Draw the process.",
}


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
    return c


def _llm(*structured):
    llm = FakeLLM([])
    llm.structured_results = list(structured)
    return llm


@pytest.fixture(autouse=True)
def _clean(settings):
    settings.OPENAI_API_KEY = ""
    settings.ANTHROPIC_API_KEY = ""
    settings.AI_RATE_LIMIT = 30
    cache.clear()


@pytest.fixture
def admin():
    return UserFactory(is_superuser=True)


@pytest.fixture
def school():
    return SchoolFactory()


@pytest.fixture
def subject(school):
    from services.education.academics.models import Subject
    return Subject.objects.create(name="Biology", code="BIO-T1", tenant=school)


@pytest.mark.django_db
class TestLessonPlan:
    def test_template_without_provider(self, admin):
        res = _client(admin).post("/api/v1/ai/lesson-plan/", {"subject": "Bio", "grade": "8", "topic": "Cells"}, format="json")
        assert res.status_code == 200
        body = res.json()
        assert body["source"] == "template" and "Cells" in body["homework"]
        assert not AIUsage.objects.exists()

    def test_generates_plan_and_records_usage(self, admin):
        llm = _llm(dict(PLAN))
        with mock.patch("services.analytics.ai_views.get_llm_client", return_value=llm):
            res = _client(admin).post("/api/v1/ai/lesson-plan/", {
                "subject": "Biology", "grade": "Class 8", "topic": "Photosynthesis",
                "objectives": "Define photosynthesis, Name the inputs",
            }, format="json")
        assert res.status_code == 200
        assert res.json()["main_activities"] == PLAN["main_activities"]
        assert "Photosynthesis" in llm.calls[0]["prompt"] and "Name the inputs" in llm.calls[0]["prompt"]
        assert AIUsage.objects.get(user=admin, feature="ai_lesson_plans").output_tokens == 50

    def test_students_cannot_generate(self):
        from tests.conftest import StudentFactory
        s = StudentFactory()
        from django.contrib.auth import get_user_model
        user = get_user_model().objects.filter(email=s.email).first() or UserFactory(email=s.email)
        res = _client(user).post("/api/v1/ai/lesson-plan/", {"subject": "B", "grade": "8", "topic": "x"}, format="json")
        assert res.status_code == 403


class TestQuestionValidation:
    def test_mcq_answer_must_be_an_option(self):
        q = {"question_type": "mcq", "question_text": "2+2?", "options": ["1", "2", "3", "4"],
             "correct_answer": "5", "explanation": ""}
        assert _clean_question(q) is None
        q["correct_answer"] = "4"
        assert _clean_question(q)["correct_answer"] == "4"

    def test_mcq_needs_four_distinct_options(self):
        q = {"question_type": "mcq", "question_text": "x", "options": ["a", "A", "b", "c"],
             "correct_answer": "a", "explanation": ""}
        assert _clean_question(q) is None

    def test_true_false_and_short_answer_normalised(self):
        tf = _clean_question({"question_type": "true_false", "question_text": "Sky is blue", "options": [],
                              "correct_answer": "true", "explanation": ""})
        assert tf["options"] == ["True", "False"] and tf["correct_answer"] == "True"
        sa = _clean_question({"question_type": "short_answer", "question_text": "Define x", "options": ["?"],
                              "correct_answer": "A thing", "explanation": ""})
        assert sa["options"] is None


@pytest.mark.django_db
class TestQuiz:
    def test_generate_saves_draft_with_valid_questions_only(self, admin, subject):
        quiz = {"title": "Cells quiz", "questions": [
            {"question_type": "mcq", "question_text": "Powerhouse?", "options": ["Nucleus", "Mitochondria", "Wall", "Vacuole"],
             "correct_answer": "Mitochondria", "explanation": "ATP.", "bloom_level": "remember"},
            {"question_type": "mcq", "question_text": "Broken", "options": ["a", "b"],
             "correct_answer": "a", "explanation": "", "bloom_level": "remember"},
        ]}
        with mock.patch("services.analytics.ai_views.get_llm_client", return_value=_llm(quiz)):
            res = _client(admin).post("/api/v1/ai/generate-quiz/",
                                      {"subject_id": str(subject.id), "topic": "Cells", "count": 2}, format="json")
        assert res.status_code == 201
        body = res.json()
        assert body["is_published"] is False and len(body["questions"]) == 1

    def test_publish_links_exam_to_chosen_class(self, admin, subject):
        from services.education.exams.models import Quiz, QuizQuestion
        quiz = Quiz.objects.create(subject=subject, title="Q", topic="t", difficulty="easy")
        for i in range(3):
            QuizQuestion.objects.create(quiz=quiz, question_type="short_answer", question_text=f"q{i}", correct_answer="a")
        cls = ClassFactory(school=SchoolFactory())
        res = _client(admin).post("/api/v1/ai/publish-quiz/", {"quiz_id": str(quiz.id), "class_id": str(cls.id)}, format="json")
        assert res.status_code == 200
        quiz.refresh_from_db()
        assert quiz.is_published and quiz.exam.class_ref_id == cls.id and quiz.exam.total_marks == 3

    def test_teacher_cannot_publish_to_other_class(self, subject, school):
        from services.core.accounts.models import TeacherProfile
        from services.core.tenants.models import TenantMembership
        from services.education.exams.models import Quiz
        teacher = UserFactory()
        TeacherProfile.objects.create(user=teacher, employee_id="T-GEN-1")
        TenantMembership.objects.create(user=teacher, school=school, role="teacher", is_primary=True)
        quiz = Quiz.objects.create(subject=subject, title="Q", topic="t", difficulty="easy")
        cls = ClassFactory(school=school)  # same school, but not a class this teacher teaches
        res = _client(teacher).post("/api/v1/ai/publish-quiz/", {"quiz_id": str(quiz.id), "class_id": str(cls.id)}, format="json")
        assert res.status_code == 403


@pytest.mark.django_db
def test_ml_endpoints_report_unavailable(admin):
    from services.analytics import ai_views
    with mock.patch.object(ai_views, "RISK_ML_AVAILABLE", False), mock.patch.object(ai_views, "FACE_ML_AVAILABLE", False):
        client = _client(admin)
        assert client.post("/api/v1/ai/train-models/", {}, format="json").status_code == 503
        assert client.post("/api/v1/ai/face-attendance/", {}, format="json").status_code == 503


@pytest.mark.django_db
def test_predictions_endpoint_is_mounted(admin):
    res = _client(admin).get("/api/v1/ai/student-predictions/")
    assert res.status_code == 200 and res.json() == []
