"""Teacher content generation (lesson plans, quizzes) with structured output."""
from __future__ import annotations

from .llm.base import LLMClient, LLMError, Usage


def _obj(properties: dict) -> dict:
    # Strict-mode schemas: every property required, no extras.
    return {"type": "object", "properties": properties, "required": list(properties), "additionalProperties": False}


_STR = {"type": "string"}
_STR_LIST = {"type": "array", "items": _STR}

LESSON_PLAN_SCHEMA = _obj({
    "duration_minutes": {"type": "integer"},
    "learning_objectives": _STR_LIST,
    "materials_needed": _STR_LIST,
    "introduction": _STR,
    "main_activities": _STR_LIST,
    "group_work": _STR,
    "differentiation": _STR,
    "assessment": _STR_LIST,
    "homework": _STR,
})

QUIZ_SCHEMA = _obj({
    "title": _STR,
    "questions": {"type": "array", "items": _obj({
        "question_type": {"type": "string", "enum": ["mcq", "true_false", "short_answer"]},
        "question_text": _STR,
        "options": _STR_LIST,
        "correct_answer": _STR,
        "explanation": _STR,
        "bloom_level": {"type": "string",
                        "enum": ["remember", "understand", "apply", "analyze", "evaluate", "create"]},
    })},
})

TEACHER_SYSTEM = (
    "You are an experienced school teacher and curriculum designer in Pakistan. "
    "Produce accurate, age-appropriate classroom material. Use plain language suited "
    "to the grade. Do not invent facts; keep content aligned with standard textbooks."
)


def generate_lesson_plan(llm: LLMClient, *, subject: str, grade: str, topic: str,
                         objectives: list[str], duration: int = 40) -> tuple[dict, Usage, str]:
    goals = "; ".join(o for o in objectives if o) or "decide suitable objectives"
    prompt = (
        f"Write a lesson plan.\n"
        f"Subject: {subject}\nClass/grade: {grade}\nTopic: {topic}\n"
        f"Learning objectives: {goals}\nPeriod length: {duration} minutes\n\n"
        "main_activities: 3-5 steps, each starting with its time in minutes (e.g. '10 min - ...'); "
        "the times plus the introduction must fit the period. differentiation: how to support "
        "weaker students and stretch stronger ones. assessment: 3-5 short questions to check understanding."
    )
    plan, usage, model = llm.structured(system=TEACHER_SYSTEM, prompt=prompt, schema=LESSON_PLAN_SCHEMA)
    plan["duration_minutes"] = max(10, min(int(plan.get("duration_minutes") or duration), 180))
    return plan, usage, model


def template_lesson_plan(*, subject: str, grade: str, topic: str, objectives: list[str],
                         duration: int = 40) -> dict:
    """Standard lesson structure used when no AI provider is configured.
    Marked with source="template" so the UI can say it isn't AI-written."""
    intro = max(5, duration // 8)
    teach = max(10, duration * 3 // 8)
    practice = max(10, duration // 4)
    wrap = max(5, duration - intro - teach - practice)
    goals = [o for o in objectives if o] or [f"Explain the key ideas of {topic}", f"Apply {topic} to simple examples"]
    return {
        "source": "template",
        "duration_minutes": duration,
        "learning_objectives": goals,
        "materials_needed": [f"{subject} textbook ({grade})", "Whiteboard and markers", f"Worksheet on {topic}"],
        "introduction": f"Start with a quick question linking {topic} to what students already know, then share today's objectives.",
        "main_activities": [
            f"{teach} min - Explain {topic} with worked examples on the board",
            f"{practice} min - Students practise with the worksheet while the teacher checks work",
            f"{wrap} min - Review answers together and clear up mistakes",
        ],
        "group_work": f"In pairs, students solve one {topic} problem and explain their answer to the class.",
        "differentiation": "Give step-by-step hints to students who need support; set an extension question for fast finishers.",
        "assessment": [f"Explain {topic} in your own words.", f"Solve one new question on {topic}."],
        "homework": f"Complete the textbook exercise on {topic}.",
    }


def generate_quiz(llm: LLMClient, *, subject: str, topic: str, difficulty: str, count: int,
                  grade: str = "") -> tuple[dict, Usage, str]:
    prompt = (
        f"Write a {difficulty} quiz of exactly {count} questions.\n"
        f"Subject: {subject}\nTopic: {topic}\n" + (f"Class/grade: {grade}\n" if grade else "") +
        "\nMix question types, mostly mcq. Rules: mcq has exactly 4 distinct options and "
        "correct_answer is copied exactly from options; true_false has options ['True', 'False']; "
        "short_answer has options [] and a concise model answer. Each explanation says why the "
        "answer is right in one or two sentences."
    )
    quiz, usage, model = llm.structured(system=TEACHER_SYSTEM, prompt=prompt, schema=QUIZ_SCHEMA)
    questions = [q for q in (_clean_question(q) for q in quiz.get("questions", [])) if q]
    if not questions:
        raise LLMError("The model did not return any valid questions.")
    return {"title": quiz.get("title") or f"Quiz: {topic}", "questions": questions[:count]}, usage, model


def _clean_question(q: dict) -> dict | None:
    """Drop questions whose answer key is inconsistent."""
    kind = q.get("question_type")
    text = (q.get("question_text") or "").strip()
    answer = (q.get("correct_answer") or "").strip()
    if not text or not answer:
        return None
    options = [o.strip() for o in (q.get("options") or []) if o and o.strip()]
    if kind == "mcq":
        if len(options) != 4 or len(set(o.lower() for o in options)) != 4:
            return None
        match = next((o for o in options if o.lower() == answer.lower()), None)
        if match is None:
            return None
        answer = match
    elif kind == "true_false":
        if answer.lower() not in ("true", "false"):
            return None
        options, answer = ["True", "False"], answer.capitalize()
    elif kind == "short_answer":
        options = None
    else:
        return None
    return {
        "question_type": kind,
        "question_text": text,
        "options": options,
        "correct_answer": answer,
        "explanation": (q.get("explanation") or "").strip(),
        "bloom_level": q.get("bloom_level") or "",
    }
