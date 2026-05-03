# This migration removes over-engineered fields from User model
# Keeps only essential authentication fields

REMOVE_FIELDS = [
    'bio', 'profile_picture', 'date_of_birth',
    'email_verification_token', 'email_verification_sent_at',
    'phone_verification_code', 'phone_verification_sent_at',
    'account_lock_reason', 'failed_login_attempts',
    'last_login_ip', 'last_login_agent', 'google_id', 'github_id',
    'microsoft_id', 'account_expires_at', 'email_notifications',
    'sms_notifications', 'marketing_emails', 'two_factor_secret',
    'communication_channels', 'consent_tracking', 'data_portability_requests',
    'gdpr_deletion_requested_at', 'gdpr_data_exported_at',
    'delegated_permissions', 'tags', 'segments', 'notes', 'metadata'
]

print(f"User model simplification would remove {len(REMOVE_FIELDS)} fields")
print("These fields should be moved to separate UserProfile model if needed")
