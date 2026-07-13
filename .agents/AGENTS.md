# ERP Workspace Rules

## Student Deletion Rules
- **Rule:** Before deleting any student, you MUST verify if they have any pending, unpaid, or partially paid invoices. If they have outstanding invoices, do not delete the student directly; prompt the user to clear or cancel the student's invoices first to maintain database consistency.

## Invoice Creation Rules
- **Rule:** Do not create duplicate active invoices for the same student, same month, and same category/type. Validate that no active (non-cancelled) invoice exists for those parameters before generating a new invoice.
