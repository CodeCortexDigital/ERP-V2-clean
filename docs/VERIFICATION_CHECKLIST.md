# Verification Checklist (Compact)

Use this checklist to quickly mark steps as done while verifying the project.

- [ ] 1. Prepare dev environment: Python, Node, rg, Docker (optional)
- [ ] 2. Install backend deps: `pip install -r backend/requirements.txt`
- [ ] 3. Install frontend deps: `cd frontend && npm install`
- [ ] 4. Run linters: backend + frontend
- [ ] 5. Run tests: `cd backend && pytest`, `cd frontend && npm run test`
- [ ] 6. Start DB and Redis
- [ ] 7. Apply migrations: `python manage.py migrate`
- [ ] 8. Seed sample data
- [ ] 9. Start backend server and confirm health endpoint
- [ ] 10. Start frontend server and confirm UI loads
- [ ] 11. Verify login flows (admin, teacher, parent, student)
- [ ] 12. Verify RBAC: try role-specific endpoints
- [ ] 13. Verify tenant isolation: create two tenants and compare
- [ ] 14. Verify Student CRUD
- [ ] 15. Verify Staff/Teacher CRUD
- [ ] 16. Verify Admissions conversion
- [ ] 17. Verify Academics: courses and syllabus mapping
- [ ] 18. Verify Timetable creation and conflict detection
- [ ] 19. Verify Attendance marking and reports
- [ ] 20. Verify Exams flow and PDF marksheets
- [ ] 21. Verify Finance flows (invoices, payments)
- [ ] 22. Verify Communication (WhatsApp/email templates)
- [ ] 23. Verify realtime notifications
- [ ] 24. Verify PDF generation for invoices/transcripts
- [ ] 25. Verify Celery tasks and scheduled jobs
- [ ] 26. Verify AI/ML script dry-runs
- [ ] 27. Verify backup & restore scripts
- [ ] 28. Verify logging & Sentry
- [ ] 29. Verify Docker build for frontend/backend
- [ ] 30. Final end-to-end smoke test
