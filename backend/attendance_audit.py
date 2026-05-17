import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

EMAIL = "admin@code.com"
PASSWORD = "admin123"


def print_response(title, response):
    print(f"\n===== {title} =====")
    print("Status:", response.status_code)

    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)


# =====================================
# STEP 1: LOGIN
# =====================================
print("\n[1] Logging in...")

login_res = requests.post(
    f"{BASE_URL}/auth/login/",
    json={
        "email": EMAIL,
        "password": PASSWORD
    }
)

print_response("LOGIN", login_res)

if login_res.status_code != 200:
    print("\nLogin failed. Stop.")
    exit()

login_data = login_res.json()

access_token = (
    login_data.get("access")
    or login_data.get("token")
    or login_data.get("access_token")
)

if not access_token:
    print("\nAccess token not found.")
    exit()

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}


# =====================================
# STEP 2: AUTH CHECK
# =====================================
print("\n[2] Testing token...")

auth_res = requests.get(
    f"{BASE_URL}/auth/me/",
    headers=headers
)

print_response("AUTH CHECK", auth_res)

if auth_res.status_code != 200:
    print("\nAuth failed. Stop.")
    exit()


# =====================================
# STEP 3: FETCH CLASSES
# =====================================
print("\n[3] Fetching classes...")

classes_res = requests.get(
    f"{BASE_URL}/auth/classes/",
    headers=headers
)

print_response("CLASSES", classes_res)

classes_data = classes_res.json()

if isinstance(classes_data, dict):
    classes = classes_data.get("results", [])
else:
    classes = classes_data

if not classes:
    print("\nNo classes found.")
    exit()

class_id = classes[0]["id"]

# =====================================
# STEP 4: FETCH SECTIONS
# =====================================
print("\n[4] Fetching sections...")

sections_res = requests.get(
    f"{BASE_URL}/auth/select-options/sections/",
    headers=headers
)

print_response("SECTIONS", sections_res)

sections_data = sections_res.json()

if isinstance(sections_data, dict):
    sections = sections_data.get("options", [])
else:
    sections = sections_data
    
if not sections:
    print("\nNo sections found.")
    exit()

section_id = sections[0]["id"]

# =====================================
# STEP 5: FETCH STUDENTS
# =====================================
print("\n[5] Fetching students...")

students_res = requests.get(
    f"{BASE_URL}/auth/students/",
    headers=headers
)

print_response("STUDENTS", students_res)

students_data = students_res.json()

if isinstance(students_data, dict):
    students = students_data.get("results", [])
else:
    students = students_data

if not students:
    print("\nNo students found.")
    exit()

student_id = students[0]["id"]


# =====================================
# STEP 6: SAVE ATTENDANCE
# =====================================
print("\n[6] Saving attendance...")

payload = {
    "records": [
        {
            "student_id": student_id,
            "status": "present",
            "date": "2026-05-17",
            "class_id": class_id,
            "section_id": section_id
        }
    ]
}

print("\nPayload:")
print(json.dumps(payload, indent=2))

save_res = requests.post(
    f"{BASE_URL}/auth/attendance/bulk/",
    headers=headers,
    json=payload
)

print_response("ATTENDANCE SAVE", save_res)


# =====================================
# STEP 7: VERIFY ATTENDANCE
# =====================================
print("\n[7] Verifying attendance...")

verify_res = requests.get(
    f"{BASE_URL}/auth/attendance/",
    headers=headers,
    params={
        "student_id": student_id
    }
)

print_response("VERIFY ATTENDANCE", verify_res)

print("\nAudit completed.")