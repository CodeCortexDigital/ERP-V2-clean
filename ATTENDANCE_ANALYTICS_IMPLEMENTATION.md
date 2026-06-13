# AI-Powered Attendance Pattern Detection - Implementation Guide

## Overview

This feature adds intelligent attendance pattern detection to the ERP system, enabling:
- **Declining Attendance Detection**: Identifies students with declining attendance trends
- **Consecutive Absence Detection**: Flags unusual absence patterns
- **Weekday Pattern Detection**: Detects recurring absences on specific days
- **Risk Scoring**: AI-driven risk assessment for at-risk students
- **Alert System**: Automatic notifications to parents and teachers
- **Analytics Dashboard**: Comprehensive visualization of patterns and trends

## Architecture

### Backend Structure

```
backend/services/education/attendance/
├── models.py (modified - added imports)
├── analytics_models.py (NEW)
│   ├── AttendanceAnalytics
│   ├── AttendancePattern
│   └── AttendanceAlert
├── detection.py (NEW - pattern detection algorithms)
├── analytics_views.py (NEW - API endpoints)
├── signals.py (existing - can be extended)
├── urls.py (modified - added analytics routes)
├── views.py (existing)
└── management/commands/
    └── detect_patterns.py (NEW - daily analysis task)
```

### Frontend Structure

```
frontend/src/
├── services/
│   └── attendance.service.ts (modified - added analytics methods)
├── pages/education/attendance/
│   ├── AttendancePage.tsx (existing)
│   └── dashboard/
│       └── AttendanceAnalyticsDashboard.tsx (NEW)
└── routes/index.tsx (modified - added analytics route)
```

## Implementation Steps

### 1. Database Migrations

Create and run migrations for new models:

```bash
python manage.py makemigrations education_attendance
python manage.py migrate
```

This creates three new tables:
- `attendance_analytics` - Daily analytics snapshots
- `attendance_pattern` - Detected patterns
- `attendance_alert` - Generated alerts

### 2. Backend Setup

All backend files have been created:
- ✅ `analytics_models.py` - Data models
- ✅ `detection.py` - Pattern detection algorithms
- ✅ `analytics_views.py` - API endpoints
- ✅ `management/commands/detect_patterns.py` - Daily task

### 3. Frontend Setup

All frontend files have been created:
- ✅ `AttendanceAnalyticsDashboard.tsx` - Main dashboard component
- ✅ Updated `attendance.service.ts` - New API methods
- ✅ Updated `routes/index.tsx` - New route

### 4. Schedule Daily Pattern Detection

#### Option A: Using Celery Beat (Recommended for Production)

```python
# In your celery config
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'detect-attendance-patterns-daily': {
        'task': 'services.education.attendance.tasks.detect_patterns_task',
        'schedule': crontab(hour=2, minute=0),  # Run at 2 AM daily
    },
}
```

Create file: `backend/services/education/attendance/tasks.py`

```python
from celery import shared_task
from django.core.management import call_command

@shared_task
def detect_patterns_task():
    """Celery task to run pattern detection daily"""
    call_command('detect_patterns')
```

#### Option B: Using Cron Job

```bash
# Add to crontab
0 2 * * * cd /path/to/project && python manage.py detect_patterns
```

#### Option C: Manual Execution (Development)

```bash
python manage.py detect_patterns
python manage.py detect_patterns --student-id=<uuid>  # Specific student
python manage.py detect_patterns --dry-run              # Preview only
```

## API Endpoints

### Analytics Endpoints

All endpoints are at `/api/auth/attendance/`:

#### GET `/analytics/`
**Returns**: Comprehensive analytics summary for user's scope

**Query Parameters**: None

**Response**:
```json
{
  "summary": {
    "total_students": 50,
    "average_attendance": 82.5,
    "at_risk_count": 8,
    "at_risk_percentage": 16.0
  },
  "students": [
    {
      "student_id": "uuid",
      "student_name": "John Doe",
      "attendance_rate": 65.0,
      "risk_level": "high",
      "risk_score": 35.0,
      "trend_direction": "down"
    }
  ]
}
```

#### GET `/patterns/`
**Returns**: List of detected attendance patterns

**Query Parameters**: None

**Response**:
```json
[
  {
    "id": "uuid",
    "student_id": "uuid",
    "student_name": "John Doe",
    "pattern_type": "declining",
    "severity": "high",
    "description": "Attendance declining from 80% to 65%...",
    "confidence_score": 0.92,
    "affected_days": 20,
    "metadata": {}
  }
]
```

#### GET `/alerts/`
**Returns**: Active alerts for at-risk students

**Query Parameters**: None

**Response**:
```json
[
  {
    "id": "uuid",
    "student_id": "uuid",
    "student_name": "John Doe",
    "alert_type": "declining",
    "title": "Attendance Declining - High",
    "message": "...",
    "priority": "high",
    "created_at": "2026-05-10T10:30:00Z"
  }
]
```

#### GET `/trends/?period=weekly&student_id=uuid`
**Returns**: Attendance trends over time

**Query Parameters**:
- `period`: `weekly` or `monthly` (default: `weekly`)
- `student_id`: Optional, specific student UUID

**Response**:
```json
[
  {
    "period": "May 03-10",
    "date": "2026-05-10",
    "present": 15,
    "absent": 2,
    "total": 17,
    "attendance_rate": 88.2
  }
]
```

#### GET `/at-risk/`
**Returns**: List of at-risk students

**Query Parameters**: None

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "student_id": "STU001",
    "class": "10-A",
    "attendance_rate": 65.0,
    "risk_level": "high",
    "risk_score": 35.0,
    "trend": "down",
    "patterns": ["declining", "consecutive"]
  }
]
```

## Role-Based Access Control

The analytics endpoints respect role-based permissions:

- **Admin**: Can see analytics for all students
- **Teacher**: Can see analytics for their assigned classes
- **Parent**: Can see analytics for their linked children
- **Student**: Can only see their own analytics

## Caching Strategy

Analytics are cached with TTL (Time To Live):
- **Analytics**: 15 minutes (900 seconds)
- **Cache Key**: Includes user ID and query parameters
- **Invalidation**: Manual cache clear can be triggered on demand

To manually clear caches:
```python
from services.core.utils.cache import (
    invalidate_analytics_cache,
    invalidate_dashboard_cache
)

invalidate_analytics_cache()
```

## Pattern Detection Algorithms

### 1. Declining Attendance Detection

**Algorithm**:
- Compares attendance over two 30-day windows
- Calculates trend percentage
- Severity based on decline amount and current rate

**Severity Levels**:
- **High**: Trend < -15% AND current rate < 75%
- **Medium**: Trend < -10% AND current rate < 80%
- **Low**: Trend < -5% AND current rate < 85%

### 2. Consecutive Absence Detection

**Algorithm**:
- Groups consecutive absence days in 90-day period
- Identifies longest sequence
- Counts pattern occurrences

**Severity Levels**:
- **High**: 5+ consecutive days
- **Medium**: 4 consecutive days
- **Low**: 3 consecutive days

### 3. Weekday Pattern Detection

**Algorithm**:
- Analyzes absences by day of week (Mon-Fri only)
- Calculates absence percentage per weekday
- Requires minimum 5 occurrences per weekday

**Detected when**: Absence percentage >= 30%

## Notification System Integration

When patterns are detected, the system automatically notifies:

1. **Parents**: Via notification bell + email (optional)
2. **Teachers**: Via notification bell
3. **Admins**: Dashboard alerts

**Notification Flow**:
```
detect_patterns command runs
  → Detects patterns for each student
  → Creates AttendancePattern records
  → Generates AttendanceAlert
  → Calls create_user_notifications_for_student_and_parents()
  → Notifications appear in UI
```

## Frontend Dashboard Features

### Tabs

1. **Overview**
   - At-risk students list
   - Risk distribution chart
   - Quick stats

2. **Patterns**
   - Detected patterns with descriptions
   - Confidence scores
   - Affected days count

3. **Trends**
   - 12-week attendance trend chart
   - Weekly/monthly aggregates
   - Line chart visualization

4. **Alerts**
   - Active alerts by priority
   - Student names and details
   - Quick action buttons

### Cards & Metrics

- **Total Students**: Count of students in scope
- **Avg Attendance**: Average attendance rate
- **At Risk**: Number and percentage of at-risk students
- **Active Alerts**: Current unresolved alerts

## Testing

### Manual Testing

1. **Generate Sample Data**:
```bash
python manage.py detect_patterns --dry-run
```

2. **Detect Patterns for Specific Student**:
```bash
python manage.py detect_patterns --student-id=<uuid>
```

3. **Force Re-detection**:
```bash
python manage.py detect_patterns --force
```

### API Testing

```bash
# Get analytics
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/auth/attendance/analytics/

# Get patterns
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/auth/attendance/patterns/

# Get alerts
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/auth/attendance/alerts/

# Get trends
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/auth/attendance/trends/?period=weekly"

# Get at-risk students
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/auth/attendance/at-risk/
```

## Performance Considerations

### Database Indexes

The analytics models include indexes on:
- `student_id`, `date` (AttendanceAnalytics)
- `pattern_type`, `severity` (AttendancePattern)
- `student_id`, `is_active` (AttendancePattern)
- `student_id`, `is_resolved` (AttendanceAlert)

### Optimization Tips

1. **Batch Processing**: Run pattern detection during off-peak hours
2. **Limit Lookback**: Adjust `lookback_days` parameter for faster processing
3. **Cache Aggressively**: TTL set to 15 minutes for analytics
4. **Archive Old Alerts**: Periodically archive resolved alerts

## Troubleshooting

### No Patterns Detected

- **Cause**: Insufficient attendance data
- **Solution**: Ensure attendance records exist (minimum 30 days recommended)

### Slow API Responses

- **Cause**: Large number of students or long lookback periods
- **Solution**: 
  - Reduce lookback_days in `detect_all_patterns()`
  - Enable caching
  - Limit query results

### Notifications Not Sending

- **Cause**: Notification service not configured
- **Solution**: Check `create_user_notification()` implementation

## Future Enhancements

1. **Machine Learning Models**: Replace heuristics with ML-based detection
2. **Predictive Analytics**: Predict future absences
3. **Intervention Suggestions**: AI-powered recommendations
4. **Family Notifications**: SMS/WhatsApp integration for alerts
5. **Custom Thresholds**: Admin-configurable severity levels
6. **Export Reports**: PDF/Excel export of analytics

## Files Modified/Created

### Modified Files
- `backend/services/education/attendance/models.py`
- `backend/services/education/attendance/urls.py`
- `frontend/src/services/attendance.service.ts`
- `frontend/src/routes/index.tsx`

### New Files
- `backend/services/education/attendance/analytics_models.py`
- `backend/services/education/attendance/detection.py`
- `backend/services/education/attendance/analytics_views.py`
- `backend/services/education/attendance/management/commands/detect_patterns.py`
- `frontend/src/pages/education/attendance/dashboard/AttendanceAnalyticsDashboard.tsx`

## Support & Documentation

For more details, refer to:
- Django ORM Documentation: https://docs.djangoproject.com/
- DRF Documentation: https://www.django-rest-framework.org/
- React Documentation: https://react.dev/
- Recharts Documentation: https://recharts.org/

---

**Implementation Status**: ✅ Complete and Ready for Testing
**Last Updated**: 2026-05-11
**Version**: 1.0
