import json
import urllib.request
import urllib.error

def generate_offline_lesson_plan(subject: str, grade: str, topic: str, objectives: list) -> dict:
    """Fallback generator in case Ollama is offline or times out."""
    return {
        "duration_minutes": 45,
        "materials_needed": [
            f"{subject} Textbook for Grade {grade}",
            "Whiteboard and markers",
            "Projector for slides",
            f"Handout on {topic}"
        ],
        "introduction": f"Begin the class by checking previous homework. Introduce the topic of '{topic}' by asking students what they already know about it. Explain the learning objectives: {', '.join(objectives)}.",
        "main_activities": [
            f"Interactive lecture: Explaining the core principles and mathematical/theoretical concepts of {topic}.",
            "Whiteboard demonstrations: Solving example problems step-by-step with student input.",
            "Independent classwork: Students complete questions from the textbook chapter."
        ],
        "group_work": f"Divide students into pairs to discuss and solve a practical problem applying the concepts of {topic}. Each pair shares their solution with the class.",
        "assessment": [
            f"Explain in your own words the main principle of {topic}.",
            f"Solve a scenario-based question applying {topic} concepts."
        ],
        "homework": f"Complete exercises 1 to 5 at the end of Chapter '{topic}' in the Grade {grade} {subject} textbook.",
        "notes": "Generated in Offline Template Mode due to local LLM service being stopped."
    }

def generate_ai_lesson_plan(subject: str, grade: str, topic: str, objectives: list) -> dict:
    prompt = (
        f"Create a detailed, professional lesson plan for:\n"
        f"Subject: {subject}\n"
        f"Grade: {grade}\n"
        f"Topic: {topic}\n"
        f"Learning Objectives: {objectives}\n\n"
        f"You must return the response in valid raw JSON format ONLY, matching this schema precisely. Do not include any markdown backticks or explanations:\n"
        f"{{\n"
        f"  \"duration_minutes\": 45,\n"
        f"  \"materials_needed\": [\"item 1\", \"item 2\"],\n"
        f"  \"introduction\": \"Intro summary here\",\n"
        f"  \"main_activities\": [\"activity 1\", \"activity 2\"],\n"
        f"  \"group_work\": \"Group activity description\",\n"
        f"  \"assessment\": [\"question 1\", \"question 2\"],\n"
        f"  \"homework\": \"Homework description\"\n"
        f"}}"
    )
    
    url = "http://127.0.0.1:11434/api/generate"
    data = {
        "model": "llama3",
        "prompt": prompt,
        "stream": False,
        "format": "json"
    }
    
    try:
        req_body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=req_body, 
            headers={"Content-Type": "application/json"}
        )
        # 3 seconds timeout to keep system responsive
        with urllib.request.urlopen(req, timeout=3) as response:
            resp_data = json.loads(response.read().decode("utf-8"))
            json_str = resp_data.get("response", "").strip()
            # Parse response
            plan_data = json.loads(json_str)
            plan_data["notes"] = "Successfully generated via local Ollama LLM."
            return plan_data
    except Exception as e:
        print(f"Ollama lesson generation failed/offline: {e}. Falling back to template.")
        return generate_offline_lesson_plan(subject, grade, topic, objectives)
