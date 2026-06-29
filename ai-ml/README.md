# AI/ML Preparation & Audit Module (Phase 0)

Welcome to the AI/ML integration workspace. This directory contains tools, check scripts, and training resources to transition our School ERP system from traditional operations to intelligent predictive features.

---

## 📁 Directory Structure

```text
ai-ml/
├── requirements.txt         # Specialized AI/ML Python packages
├── README.md                # This setup guide (English & Roman Urdu)
├── audit/
│   └── data_audit.py        # Django DB integration & AI training readiness audit
├── setup/
│   └── verify_infra.py      # Checks Ollama, Redis, Postgres & Python imports
└── training/
    └── README.md            # Curated ML/AI learning syllabus for developers
```

---

## 🇬🇧 Getting Started (English)

### 1. Install Dependencies
Make sure your Python environment is active, then run:
```bash
pip install -r ai-ml/requirements.txt
```

### 2. Verify Your Infrastructure
Ensure local helper services (Redis, Ollama) and your database are active. Run the verification script:
```bash
python ai-ml/setup/verify_infra.py
```
This script checks local ports, Python library packages, and database connectivity. If any service is missing, it prints installation and configuration guidance for Windows.

### 3. Run the Data Audit
To evaluate whether your database contains enough historical records to train predictive models, run:
```bash
python ai-ml/audit/data_audit.py
```
This script queries core academic, attendance, and finance tables, evaluates data counts against AI training thresholds, and outputs a readiness report.

---

## 🇵🇰 Shuruat Kaise Karein (Roman Urdu)

### 1. Dependencies Install Karein
Apna Python virtual environment active karein aur ye command chalayein:
```bash
pip install -r ai-ml/requirements.txt
```

### 2. Infrastructure Verify Karein
Check karein ke Ollama, Redis aur database active hain ya nahi. Verification script run karein:
```bash
python ai-ml/setup/verify_infra.py
```
Ye script systems ports, Python libraries, aur DB connections ko check karega. Agar koi service missing hui, to ye Windows ke mutabiq installation guide print karega.

### 3. Data Audit Chalayein
Ye dekhne ke liye ke database me machine learning models train karne ke liye kaafi data mojood hai ya nahi, ye command chalayein:
```bash
python ai-ml/audit/data_audit.py
```
Ye script attendance, academics aur finance tables me se records count karega aur AI training readiness report banayega.
