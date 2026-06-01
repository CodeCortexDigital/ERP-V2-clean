import os
import requests
import json
from decimal import Decimal

BASE_URL = os.environ.get('AUDIT_BASE_URL', 'http://127.0.0.1:8000/api/v1')
EMAIL = os.environ.get('AUDIT_EMAIL')
PASSWORD = os.environ.get('AUDIT_PASSWORD')

if not EMAIL or not PASSWORD:
    raise EnvironmentError('AUDIT_EMAIL and AUDIT_PASSWORD environment variables are required.')


def pretty(title, data):
    print(f"\n===== {title} =====")
    print(json.dumps(data, indent=2, default=str))


# -----------------------------------
# STEP 1 LOGIN
# -----------------------------------
print("\n[1] Logging in...")

login_response = requests.post(
    f"{BASE_URL}/auth/login/",
    json={
        "email": EMAIL,
        "password": PASSWORD
    }
)

pretty("LOGIN", login_response.json())

if login_response.status_code != 200:
    print("Login failed.")
    exit()

token = login_response.json()["access"]

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# -----------------------------------
# STEP 2 GET STUDENTS
# -----------------------------------
print("\n[2] Fetching students...")

students_response = requests.get(
    f"{BASE_URL}/auth/students/",
    headers=headers
)

students_data = students_response.json()

if isinstance(students_data, list):
    student = students_data[0]
else:
    student = students_data["results"][0]

student_id = student["id"]

pretty("FIRST STUDENT ONLY", student)

# -----------------------------------
# STEP 3 GET FEE STRUCTURES
# -----------------------------------
print("\n[3] Fetching fee structures...")

fee_response = requests.get(
    f"{BASE_URL}/auth/finance/fee-structures/",
    headers=headers
)

fee_data = fee_response.json()

pretty("FEE STRUCTURES", fee_data)

if isinstance(fee_data, list):
    fee_structure = fee_data[0]
else:
    fee_structure = fee_data["results"][0]

fee_structure_id = fee_structure["id"]


# -----------------------------------
# STEP 4 CREATE INVOICE
# -----------------------------------
print("\n[4] Creating invoice...")

invoice_payload = {
    "student": student_id,
    "fee_structure": fee_structure_id,
    "amount": "10000.00",
    "discount_amount": "1000.00",
    "due_date": "2026-05-30",
    "description": "Audit Test Invoice"
}

invoice_response = requests.post(
    f"{BASE_URL}/auth/finance/invoices/",
    headers=headers,
    json=invoice_payload
)

print("\n===== INVOICE RESPONSE =====")
print("Status Code:", invoice_response.status_code)

try:
    invoice_data = invoice_response.json()
    pretty("INVOICE CREATED", invoice_data)
except:
    print(invoice_response.text)
    exit()

if invoice_response.status_code not in [200, 201]:
    exit()

invoice_id = invoice_data["id"]


# -----------------------------------
# STEP 5 CREATE PAYMENT
# -----------------------------------
print("\n[5] Creating payment...")

payment_payload = {
    "invoice": invoice_id,
    "amount": "5000.00",
    "payment_method": "cash"
}

payment_response = requests.post(
    f"{BASE_URL}/auth/finance/payments/",
    headers=headers,
    json=payment_payload
)

print("\n===== PAYMENT RESPONSE =====")
print("Status Code:", payment_response.status_code)

try:
    payment_data = payment_response.json()
    pretty("PAYMENT CREATED", payment_data)
except:
    print(payment_response.text)
    exit()

# -----------------------------------
# STEP 6 VERIFY INVOICE
# -----------------------------------
print("\n[6] Verifying invoice...")

invoice_check = requests.get(
    f"{BASE_URL}/auth/finance/invoices/{invoice_id}/",
    headers=headers
)

invoice_verify = invoice_check.json()

pretty("UPDATED INVOICE", invoice_verify)


# -----------------------------------
# STEP 7 VERIFY ALGORITHM
# -----------------------------------
print("\n[7] Checking pending fee...")

amount = Decimal(str(invoice_verify["amount"]))
discount = Decimal(str(invoice_verify["discount_amount"]))
late_fee = Decimal(str(invoice_verify["late_fee_amount"]))
paid = Decimal(str(invoice_verify["paid_amount"]))

expected_pending = (amount - discount + late_fee) - paid

print(f"Expected Pending: {expected_pending}")

backend_pending = Decimal(
    str(invoice_verify["total_amount"])
) - paid

print(f"Backend Pending: {backend_pending}")

if expected_pending == backend_pending:
    print("PASS: Pending algorithm correct")
else:
    print("FAIL: Pending algorithm mismatch")


# -----------------------------------
# STEP 8 SUMMARY
# -----------------------------------
print("\n[8] Checking finance summary...")

summary_response = requests.get(
    f"{BASE_URL}/auth/finance/summary/",
    headers=headers
)

pretty("FINANCE SUMMARY", summary_response.json())


print("\nALL AUDITS COMPLETED.")