# Create CONTRIBUTING.md
@"
# ============================================
# FILE: D:\Code Cortex\03_Projects\Current\6_ERP-V2\backend\services\core\accounts-service\CONTRIBUTING.md
# ============================================

# Contributing to Accounts Service

We love your input! We want to make contributing to the Accounts Service as easy and transparent as possible.

## Development Process

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/erp/accounts-service.git
cd accounts-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\Activate

# Install development dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Set up pre-commit hooks
pre-commit install
pre-commit install --hook-type commit-msg

# Set up database
python manage.py migrate
python manage.py seed_data

# Create admin user
python manage.py create_admin

# Run tests
pytest