import json
import random

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

# High quality offline fallback quiz database to ensure instant responses when offline
OFFLINE_QUIZ_CATALOG = {
    "chemistry": {
        "acids & bases": [
            {
                "question_type": "mcq",
                "question_text": "What is the pH of a neutral solution at 25 degrees Celsius?",
                "options": ["5", "7", "9", "14"],
                "correct_answer": "7",
                "explanation": "At 25C, a pH of 7 represents a neutral solution with equal concentration of hydronium and hydroxide ions."
            },
            {
                "question_type": "mcq",
                "question_text": "Which of the following is a strong acid?",
                "options": ["Acetic acid", "Hydrochloric acid", "Citric acid", "Carbonic acid"],
                "correct_answer": "Hydrochloric acid",
                "explanation": "Hydrochloric acid (HCl) dissociates completely in water, classifying it as a strong mineral acid."
            },
            {
                "question_type": "true_false",
                "question_text": "Acids turn red litmus paper blue.",
                "options": ["True", "False"],
                "correct_answer": "False",
                "explanation": "Acids turn blue litmus paper red, while bases turn red litmus paper blue."
            },
            {
                "question_type": "short_answer",
                "question_text": "According to Bronsted-Lowry theory, what is the definition of an acid?",
                "options": None,
                "correct_answer": "Proton donor (or H+ donor)",
                "explanation": "In Bronsted-Lowry theory, an acid is any substance that can donate a hydrogen ion (proton) to another substance."
            }
        ]
    },
    "physics": {
        "mechanics": [
            {
                "question_type": "mcq",
                "question_text": "What is the acceleration due to gravity near Earth's surface?",
                "options": ["4.8 m/s^2", "9.8 m/s^2", "12.2 m/s^2", "98 m/s^2"],
                "correct_answer": "9.8 m/s^2",
                "explanation": "The standard acceleration due to gravity at Earth's surface is approximately 9.8 m/s^2."
            },
            {
                "question_type": "true_false",
                "question_text": "An object in motion will remain in motion unless acted upon by an external force.",
                "options": ["True", "False"],
                "correct_answer": "True",
                "explanation": "This is Newton's First Law of Motion, also known as the Law of Inertia."
            },
            {
                "question_type": "short_answer",
                "question_text": "What is the formula representing Newton's Second Law of Motion?",
                "options": None,
                "correct_answer": "F = ma",
                "explanation": "Newton's Second Law states that Force is equal to Mass multiplied by Acceleration (F = ma)."
            }
        ]
    }
}

def get_offline_fallback_quiz(subject: str, topic: str, difficulty: str, count: int) -> dict:
    """Selects and slices questions from our offline catalog, falling back to a generic template generator."""
    sub_key = subject.lower().strip()
    top_key = topic.lower().strip()
    
    available_questions = []
    if sub_key in OFFLINE_QUIZ_CATALOG and top_key in OFFLINE_QUIZ_CATALOG[sub_key]:
        available_questions = OFFLINE_QUIZ_CATALOG[sub_key][top_key]
    else:
        # Generate generic mock questions dynamically
        available_questions = [
            {
                "question_type": "mcq",
                "question_text": f"Which of the following describes a key concept in {topic} ({subject})?",
                "options": ["Option A: Primary state", "Option B: Secondary effect", "Option C: Standard formula", "Option D: None of the above"],
                "correct_answer": "Option A: Primary state",
                "explanation": "This is a generic concept matching the selected subject parameters."
            },
            {
                "question_type": "true_false",
                "question_text": f"Is it true that {topic} is considered a fundamental topic within {subject} studies?",
                "options": ["True", "False"],
                "correct_answer": "True",
                "explanation": "Topic core importance is recognized internationally."
            },
            {
                "question_type": "short_answer",
                "question_text": f"Define the primary objective of studying {topic} in one sentence.",
                "options": None,
                "correct_answer": f"To understand principles of {topic}.",
                "explanation": "Fostering general literacy in the discipline."
            }
        ]
        
    # Pick requested number of questions
    selected = []
    for i in range(count):
        # Repeat/cycle list if count exceeds available questions
        q = available_questions[i % len(available_questions)]
        selected.append(q.copy())
        
    return {
        "title": f"AI generated Quiz - {topic.title()}",
        "subject": subject,
        "topic": topic,
        "difficulty": difficulty,
        "questions": selected,
        "offline": True
    }

def generate_ai_quiz(subject: str, topic: str, difficulty: str, count: int = 4) -> dict:
    """Generates structured quiz questions using Ollama, falling back to the offline catalog on timeout or errors."""
    if OLLAMA_AVAILABLE:
        prompt = f"""
Generate a school quiz with exactly {count} questions for:
Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}

Include a mix of 'mcq', 'true_false', and 'short_answer' question types.
Return the result strictly as a JSON object matching this schema:
{{
  "title": "quiz title string",
  "subject": "{subject}",
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "questions": [
    {{
      "question_type": "mcq",
      "question_text": "question string",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": "option A",
      "explanation": "explanation string"
    }},
    {{
      "question_type": "true_false",
      "question_text": "question string",
      "options": ["True", "False"],
      "correct_answer": "True",
      "explanation": "explanation string"
    }},
    {{
      "question_type": "short_answer",
      "question_text": "question string",
      "options": null,
      "correct_answer": "expected answer",
      "explanation": "explanation string"
    }}
  ]
}}
"""
        try:
            response = ollama.chat(
                model='llama3',
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.3}
            )
            content = response['message']['content']
            
            # Clean possible markdown JSON wrappers
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            quiz_data = json.loads(content)
            quiz_data["offline"] = False
            return quiz_data
        except Exception as e:
            print(f"Ollama quiz generation failed: {e}. Using offline fallback.")
            
    # Fallback catalog
    return get_offline_fallback_quiz(subject, topic, difficulty, count)
