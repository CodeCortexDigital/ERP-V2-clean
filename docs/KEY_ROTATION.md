# Keys: where they live and how to change one

All keys and passwords for the live site live in **Render → erp-backend → Environment**, never in the code or the
repository. The platform owner's **All Schools → Live site settings** panel shows which ones are set.

Change a key when someone who knew it leaves, when it may have been seen (pasted in a chat, a screenshot, a log), or
once a year.

## SECRET_KEY (signs sign-in tokens, links in emails, and encrypts saved integration secrets)

1. Copy the current value.
2. Set `SECRET_KEY` to a new long random value, e.g. `python -c "import secrets; print(secrets.token_urlsafe(50))"`.
3. Set `SECRET_KEY_FALLBACKS` to the **old** value. Password-reset and confirmation links already sent keep working,
   and saved integration secrets (school email, Microsoft, Google Classroom) can still be opened.
4. Deploy. Everyone is signed out once (sign-in tokens are signed with the key), which is expected.
5. In the Render shell: `python manage.py rotate_secrets`, which re-encrypts the integration secrets with the new key.
6. After a week (when old email links have expired), remove `SECRET_KEY_FALLBACKS`.

If `BACKUP_ENCRYPTION_KEY` is not set, backups are encrypted with a key made from `SECRET_KEY`. Keep the old value
in `SECRET_KEY_FALLBACKS` for as long as you may need to restore a backup made before the change, or better, set
`BACKUP_ENCRYPTION_KEY` first.

## BACKUP_ENCRYPTION_KEY

1. Make a new key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
2. Put the old one in `BACKUP_ENCRYPTION_KEY_FALLBACKS` and the new one in `BACKUP_ENCRYPTION_KEY`, then deploy.
3. New backups use the new key. Keep the old one in the fallbacks until every backup made with it has expired
   (the retention period, 30 days by default), then remove it.
4. Staging reads the live backups, so give it the same values.

## Other keys (change them at the provider, then on Render)

| Key | Where to change it |
| --- | --- |
| `PLATFORM_STRIPE_SECRET_KEY`, `PLATFORM_STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Developers: roll the key / signing secret. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS IAM: create a new access key, deploy, then delete the old one. |
| `EMAIL_HOST_PASSWORD` | Your email provider (an app password or SMTP key). |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | The AI provider's console. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud console → Credentials. |
| `SENTRY_DSN` | Sentry → project settings → Client keys. |
| Database password | Render manages it (`DB_PASSWORD` comes from the database). |

Each school's own keys (card payments, SMS, WhatsApp, school email, Microsoft sign-in) are changed by that school in
the app, and the new value replaces the old one straight away.

## Passwords

- The demo accounts (`admin@code.com` and the others in the README) and their passwords are for a developer's computer
  only. On the live site nobody can sign in with a demo or old default password: they are sent a link to choose their
  own. Nobody can choose one anywhere, and the demo seed commands refuse to run on the live site.
- `ADMIN_PASSWORD` is only used for the very first start. Remove it from Render once you have signed in and changed it.
