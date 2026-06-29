import os
import json
import urllib.request
import urllib.error

# sklearn imports commented out - install scikit-learn for full functionality
# from sklearn.feature_extraction.text import TfidfVectorizer
# from sklearn.metrics.pairwise import cosine_similarity

# Path to the FAQ knowledge base
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
KB_PATH = os.path.join(CURRENT_DIR, "knowledge_base.json")

def load_knowledge_base():
    try:
        with open(KB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading knowledge base: {e}")
        return []

def get_semantic_matches(query: str, top_k: int = 2):
    # sklearn is not installed - returning empty matches
    # This will cause chat_response to use the Ollama fallback
    return []

def query_ollama(prompt: str, model_name: str = "llama3") -> str:
    url = "http://127.0.0.1:11434/api/generate"
    data = {
        "model": model_name,
        "prompt": prompt,
        "stream": False
    }
    req_body = json.dumps(data).encode("utf-8")
    
    req = urllib.request.Request(
        url, 
        data=req_body, 
        headers={"Content-Type": "application/json"}
    )
    
    # 2 seconds timeout to fail fast if Ollama is slow/not running
    with urllib.request.urlopen(req, timeout=3) as response:
        resp_data = json.loads(response.read().decode("utf-8"))
        return resp_data.get("response", "").strip()

def chat_response(query: str) -> dict:
    matches = get_semantic_matches(query)
    
    # If no matches found in the KB, use general fallback prompt
    if not matches:
        prompt = (
            f"You are a helpful School ERP AI assistant. The user is asking: '{query}'. "
            f"Please respond politely, stating that you can assist with general school policies, "
            f"attendance, grades, or billing, but do not have information on this specific topic."
        )
        try:
            response_text = query_ollama(prompt)
            return {"response": response_text, "source": "Ollama LLM (General Response)", "status": "online"}
        except Exception:
            return {
                "response": "I'm sorry, I couldn't find any information on that. I can assist you with attendance rules, fee balances, timetables, and grading policy queries.",
                "source": "Fallback Rule Engine",
                "status": "offline"
            }

    # If matches exist, assemble context for RAG
    context = "\n".join([f"Q: {m['question']}\nA: {m['answer']}" for m in matches])
    prompt = (
        f"You are a friendly School ERP AI assistant. Use the following context to answer the user's question. "
        f"Answer clearly, concisely, and supportively.\n\n"
        f"Context:\n{context}\n\n"
        f"User Question: {query}\n\n"
        f"Answer:"
    )
    
    try:
        response_text = query_ollama(prompt)
        return {
            "response": response_text,
            "source": f"Ollama RAG (Matched FAQ: '{matches[0]['question']}')",
            "status": "online"
        }
    except Exception as e:
        # Offline fallback: serve the best matched FAQ directly
        best_match = matches[0]
        return {
            "response": f"[Offline FAQ Mode] {best_match['answer']}",
            "source": f"Semantic FAQ Fallback (Matched: '{best_match['question']}' with {int(best_match['score']*100)}% similarity)",
            "status": "offline"
        }
