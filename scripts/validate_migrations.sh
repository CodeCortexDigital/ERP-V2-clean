#!/bin/bash

################################################################################
# Migration Validation Script
# Validates database migrations before applying them
# Usage: ./validate_migrations.sh
################################################################################

set -e

# Configuration
cd "$(dirname "$0")/.../backend"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Migration Validation${NC}"
echo -e "${BLUE}================================${NC}"

################################################################################
# 1. Check for unapplied migrations
################################################################################
echo ""
echo -e "${BLUE}[1/5]${NC} Checking for unapplied migrations..."

if python manage.py migrate --check 2>/dev/null; then
    echo -e "${GREEN}✓${NC} No unapplied migrations found"
else
    echo -e "${YELLOW}⚠${NC} Unapplied migrations detected"
fi

################################################################################
# 2. Check for migration conflicts
################################################################################
echo ""
echo -e "${BLUE}[2/5]${NC} Checking for migration conflicts..."

migration_count=$(find . -name "migrations" -type d | xargs find -name "*.py" -type f | grep -E "[0-9]{4}_" | wc -l)

if [ "$migration_count" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $migration_count migration files"
else
    echo -e "${YELLOW}⚠${NC} No migration files found"
fi

################################################################################
# 3. Run makemigrations check (dry-run)
################################################################################
echo ""
echo -e "${BLUE}[3/5]${NC} Running makemigrations check (dry-run)..."

if python manage.py makemigrations --check --dry-run --no-input 2>/dev/null; then
    echo -e "${GREEN}✓${NC} No new migrations required"
else
    echo -e "${RED}✗${NC} New migrations detected"
    echo "Run: python manage.py makemigrations"
fi

################################################################################
# 4. Validate migration files
################################################################################
echo ""
echo -e "${BLUE}[4/5]${NC} Validating migration files..."

migrations_dir="./erp_core"
invalid_migrations=0

for migration_file in $(find . -path ./venv -prune -o -name "*.py" -print | grep migrations | grep -E "[0-9]{4}_"); do
    if ! python -m py_compile "$migration_file" 2>/dev/null; then
        echo -e "${RED}✗${NC} Invalid migration: $migration_file"
        ((invalid_migrations++))
    fi
done

if [ $invalid_migrations -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All migration files are valid"
else
    echo -e "${RED}✗${NC} Found $invalid_migrations invalid migration files"
fi

################################################################################
# 5. Database compatibility check
################################################################################
echo ""
echo -e "${BLUE}[5/5]${NC} Checking database compatibility..."

if python manage.py dbshell <<< "SELECT 1;" &>/dev/null; then
    echo -e "${GREEN}✓${NC} Database connection successful"
else
    echo -e "${RED}✗${NC} Cannot connect to database"
    exit 1
fi

################################################################################
# Summary
################################################################################
echo ""
echo -e "${BLUE}================================${NC}"

if [ $invalid_migrations -eq 0 ]; then
    echo -e "${GREEN}✓ All validation checks passed!${NC}"
    echo -e "${BLUE}================================${NC}"
    exit 0
else
    echo -e "${RED}✗ Some validation checks failed${NC}"
    echo -e "${BLUE}================================${NC}"
    exit 1
fi
