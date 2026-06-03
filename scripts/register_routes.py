from pathlib import Path
import re

ROOT = Path(".")
FRONTEND_PAGES = ROOT / "frontend/src/pages"

def generate_routes():
    routes = []
    for page in FRONTEND_PAGES.rglob("*.tsx"):
        page_name = page.stem
        if page_name in ['index', 'types', 'utils', 'components']:
            continue
        route_name = re.sub(r'(?<!^)(?=[A-Z])', '-', page_name).lower()
        route = f"/education/{route_name}"
        routes.append((page_name, route))
    
    print("// Add these imports to App.tsx:\n")
    for page_name, _ in routes[:30]:
        print(f"import {page_name} from '@/pages/{page_name}';")
    
    print("\n// Add these routes:\n")
    for page_name, route in routes[:30]:
        print(f'<Route path="{route}" element={{<ProtectedRoute><{page_name} /></ProtectedRoute>}} />')

if __name__ == "__main__":
    generate_routes()
