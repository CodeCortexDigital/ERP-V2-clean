# Release checklist

A short list for each release to schools. The pipeline does most of it; the ticks are what a person checks.

## Before you push to main

- [ ] Tests pass on your machine for what you changed: `pytest tests/test_<area>.py` (backend) and `npx vitest run` (frontend).
- [ ] New models or fields have a migration: `python manage.py makemigrations --check --dry-run` says "No changes detected".
- [ ] A new setting that the live site needs (an environment variable) is added to `render.yaml` and to the checklist in `docs/inprogress upgradation.md`.
- [ ] A change people will notice (new screen, new rule, changed behaviour) is written down for the schools' "What's new" note.

## Try it on staging (for bigger changes)

1. `git push origin main:staging`. Staging rebuilds with an anonymised copy of the latest live backup.
2. Sign in with an account email from staging and `STAGING_PASSWORD`, and try the change as an administrator, a teacher and a parent.
3. Nothing on staging reaches real people: emails only go to the log, and payment and SMS keys are removed.

## Push

1. `git push origin main`.
2. GitHub **CI** runs: backend tests, production settings and migrations on Postgres, and the frontend type check, tests and build. If anything fails, Render does **not** deploy, and GitHub emails you.
3. When CI passes, Render deploys. Then the GitHub **Deploy check** waits until the live backend reports the new commit at `/api/v1/health/version/`. If that doesn't happen within 20 minutes, the check fails: open the Render deploy log.

## After the deploy

- [ ] The Deploy check is green.
- [ ] Sign in on the live site and open the changed screen.
- [ ] Platform → Errors shows nothing new in the next hour. New errors are also emailed.
- [ ] If something is badly wrong, in Render → erp-backend → Events, roll back to the previous deploy. Database changes from migrations stay, so a migration that removes data needs a backup restore (Platform → Backups).
