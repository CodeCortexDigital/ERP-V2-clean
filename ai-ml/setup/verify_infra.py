import sys
import os
import socket
import urllib.request
import urllib.error

# Configure stdout for UTF-8 to avoid Unicode encoding issues in Windows command prompt
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def check_package(name, import_name):
    try:
        __import__(import_name)
        return True, "Installed"
    except ImportError:
        return False, "Not Installed"

def check_port(host, port):
    try:
        with socket.create_connection((host, port), timeout=2):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def check_ollama():
    try:
        # Ollama has an HTTP server running on port 11434
        req = urllib.request.Request("http://127.0.0.1:11434/")
        with urllib.request.urlopen(req, timeout=2) as response:
            return True, "Running"
    except urllib.error.URLError as e:
        return False, f"Not Running ({e.reason if hasattr(e, 'reason') else str(e)})"
    except Exception as e:
        return False, f"Not Running ({str(e)})"

def main():
    print("=" * 60)
    print("🛠️  AI/ML INFRASTRUCTURE VERIFICATION")
    print("=" * 60)

    # 1. Check Python Libraries
    print("\n📦 1. Python ML Packages:")
    packages = {
        "Scikit-learn": "sklearn",
        "XGBoost": "xgboost",
        "OpenCV": "cv2",
        "DeepFace": "deepface",
        "Ollama Client": "ollama",
        "Redis Client": "redis",
        "Pandas": "pandas"
    }
    
    pkg_status = {}
    all_packages_ok = True
    for name, imp_name in packages.items():
        ok, status = check_package(name, imp_name)
        pkg_status[name] = ok
        status_symbol = "✅" if ok else "❌"
        print(f"   {status_symbol} {name:<15}: {status}")
        if not ok:
            all_packages_ok = False

    # 2. Check Redis Port 6379
    print("\n🔴 2. Redis Server (Port 6379):")
    redis_ok = check_port("127.0.0.1", 6379)
    redis_symbol = "✅" if redis_ok else "❌"
    print(f"   {redis_symbol} Connection: {'Connected' if redis_ok else 'Connection Refused'}")

    # 3. Check Ollama local server
    print("\n🦙 3. Ollama Local LLM (Port 11434):")
    ollama_ok, ollama_status = check_ollama()
    ollama_symbol = "✅" if ollama_ok else "❌"
    print(f"   {ollama_symbol} Status: {ollama_status}")

    # 4. Check Database Connection
    print("\n🗄️  4. Django Database Connection:")
    db_ok = False
    db_type = "Unknown"
    db_error = ""
    try:
        # Setup Django
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_path = os.path.abspath(os.path.join(current_dir, '..', '..', 'backend'))
        if os.name == 'nt' and len(backend_path) > 1 and backend_path[1] == ':':
            backend_path = backend_path[0].upper() + backend_path[1:]
        sys.path.append(backend_path)
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
        import django
        django.setup()
        
        from django.db import connection
        # Check connection
        connection.ensure_connection()
        db_ok = True
        db_type = connection.vendor
    except Exception as e:
        db_error = str(e)
    
    db_symbol = "✅" if db_ok else "❌"
    if db_ok:
        print(f"   {db_symbol} Connection: Successful (Vendor: {db_type})")
    else:
        print(f"   {db_symbol} Connection: Failed ({db_error})")

    # Final summary and installation guidelines
    print("\n" + "=" * 60)
    print("📋 RESOLUTION & SETUP GUIDELINES FOR WINDOWS")
    print("=" * 60)

    issues_found = not (all_packages_ok and redis_ok and ollama_ok and db_ok)

    if not issues_found:
        print("\n🎉 Everything is set up correctly! You are ready for AI/ML development.")
        return

    if not all_packages_ok:
        print("\n[Package Installation]")
        print("  Some required Python packages are missing. Install them via:")
        print("  👉 pip install -r ai-ml/requirements.txt")

    if not redis_ok:
        print("\n[Redis Setup]")
        print("  Redis server is not running on port 6379.")
        print("  Options for Windows:")
        print("  1. Run Redis via WSL: 'sudo service redis-server start'")
        print("  2. Download native Windows port or Memurai (https://www.memurai.com/) and start the service.")
        print("  3. Run Redis via Docker: 'docker run -d -p 6379:6379 redis'")

    if not ollama_ok:
        print("\n[Ollama local LLM Setup]")
        print("  Ollama is not running on port 11434.")
        print("  1. Download Ollama for Windows from: https://ollama.com/download/windows")
        print("  2. Install and launch the Ollama desktop application.")
        print("  3. Pull your target model in the terminal, for example:")
        print("     👉 ollama pull llama3")

    if not db_ok:
        print("\n[Database Connection]")
        print("  Could not establish connection to the database.")
        print("  1. Verify PostgreSQL service is running on your machine.")
        print("     On Windows (Admin cmd): 'net start postgresql-x64-16' (or your installed version)")
        print("  2. Or, set 'USE_SQLITE=True' in backend/.env for local SQLite fallback.")

    print("\n" + "=" * 60)

if __name__ == '__main__':
    main()
