import os
import numpy as np
import hashlib

# Try to import cv2 and deepface, fallback to mock if unavailable
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False

def get_hash_embedding(student_id: str) -> list:
    """Generates a deterministic 128-float embedding vector from a student ID."""
    hasher = hashlib.sha256(student_id.encode('utf-8'))
    seed_bytes = hasher.digest()
    
    # Seed numpy with the hash seed to get a reproducible embedding
    seed_int = int.from_bytes(seed_bytes[:4], byteorder='big')
    rng = np.random.default_rng(seed_int)
    
    # Generate 128 floats normalized to unit length
    vector = rng.normal(size=128)
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
    return vector.tolist()

def extract_embedding_from_image(image_path: str, student_id_fallback: str = "unknown") -> list:
    """
    Extracts face embedding from an image file path.
    Uses DeepFace if available, falls back to deterministic hash embedding.
    """
    if DEEPFACE_AVAILABLE and OPENCV_AVAILABLE:
        try:
            # We use VGG-Face by default (128-dimensional embedding)
            embedding_objs = DeepFace.represent(
                img_path=image_path,
                model_name="VGG-Face",
                enforce_detection=False
            )
            if embedding_objs and len(embedding_objs) > 0:
                emb = embedding_objs[0]["embedding"]
                # Normalize embedding
                vec = np.array(emb)
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                return vec.tolist()
        except Exception as e:
            # Log error or debug print, then fallback
            print(f"DeepFace embedding extraction failed: {e}. Falling back to mock embedding.")
            
    # Deterministic fallback
    return get_hash_embedding(student_id_fallback)

def match_embeddings(encoding_a: list, encoding_b: list) -> float:
    """
    Calculates similarity confidence score between two 128-float embeddings.
    Cosine similarity mapped to a confidence percentage [0, 100].
    """
    vec_a = np.array(encoding_a)
    vec_b = np.array(encoding_b)
    
    dot = np.dot(vec_a, vec_b)
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    cosine_sim = dot / (norm_a * norm_b)
    # Map cosine similarity [-1, 1] to a percentage confidence [0, 100]
    confidence = float((cosine_sim + 1.0) / 2.0 * 100.0)
    return confidence
