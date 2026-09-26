"""Everything a school owns, for export (P13) and for deletion at the end of its contract."""
from __future__ import annotations

import csv
import io
import json
import re
import zipfile
from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import IntegrityError, models, transaction
from django.db.models import ProtectedError
from django.utils import timezone

from services.core.tenants.registry import tenant_paths

SENSITIVE = re.compile(r'password|secret|token|api_?key|private_key|credential|otp|two_factor', re.I)
MAX_FILES_BYTES = 500 * 1024 * 1024  # uploaded files included in a zip export, at most


def school_querysets(school):
    """(label, model, queryset) for every kind of record that belongs to the school."""
    for label, path in sorted(tenant_paths().items()):
        if not path.endswith('tenant'):
            continue
        try:
            Model = apps.get_model(label)
        except LookupError:
            continue
        yield label, Model, Model._base_manager.filter(**{path: school})


def _fields(Model):
    return [f for f in Model._meta.concrete_fields if not SENSITIVE.search(f.name)]


def _value(field, obj):
    v = field.value_from_object(obj)
    if isinstance(field, models.FileField):
        return getattr(v, 'name', '') or ''
    if v is None:
        return None
    if isinstance(v, (UUID, Decimal)):
        return str(v)
    if isinstance(v, (datetime, date, time)):
        return v.isoformat()
    if isinstance(v, (dict, list)):
        return v
    return v


def _people(school):
    from services.core.security.access import ROLE_LABELS, school_people

    roles = school_people(school)
    User = get_user_model()
    return [{'email': u.email, 'name': u.full_name, 'role': ROLE_LABELS.get(roles[u.pk], roles[u.pk]), 'active': u.is_active,
             'last_sign_in': u.last_login.isoformat() if u.last_login else None}
            for u in User.objects.filter(pk__in=list(roles)).order_by('email')]


def _file_names(Model, qs):
    names = [f.name for f in Model._meta.concrete_fields if isinstance(f, models.FileField)]
    if not names:
        return []
    out = []
    for row in qs.values_list(*names):
        out += [n for n in row if n]
    return out


def collect(school):
    """{label: (field names, rows)} plus the people list and uploaded file names."""
    tables, files = {}, []
    for label, Model, qs in school_querysets(school):
        fields = _fields(Model)
        rows = [[_value(f, obj) for f in fields] for obj in qs.iterator()]
        if rows:
            tables[label] = ([f.attname for f in fields], rows)
            files += _file_names(Model, qs)
    people = _people(school)
    return tables, people, sorted(set(files))


def _manifest(school, tables, people, files, fmt):
    return {
        'school': school.name, 'school_code': school.tenant_code, 'exported_at': timezone.now().isoformat(), 'format': fmt,
        'records': {label: len(rows) for label, (_, rows) in tables.items()}, 'people': len(people), 'files': len(files),
        'left_out': 'Passwords, sign-in secrets and integration keys are never exported.',
    }


def _add_files(zf, files):
    from django.core.files.storage import default_storage

    total, added = 0, 0
    for name in files:
        try:
            size = default_storage.size(name)
            if total + size > MAX_FILES_BYTES:
                break
            with default_storage.open(name, 'rb') as fh:
                zf.writestr(f'files/{name}', fh.read())
            total += size
            added += 1
        except Exception:
            continue
    return added


def build(school, fmt):
    """Returns (bytes, filename, counts)."""
    tables, people, files = collect(school)
    manifest = _manifest(school, tables, people, files, fmt)
    stamp = timezone.localtime().strftime('%Y%m%d-%H%M')
    base = f'{school.tenant_code.lower()}-export-{stamp}'
    buf = io.BytesIO()
    if fmt == 'xlsx':
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.title = 'About this export'
        for k, v in manifest.items():
            ws.append([k, json.dumps(v) if isinstance(v, dict) else v])
        sheets = {'About this export'}
        def sheet(title):
            t = re.sub(r'[\[\]\*\?/\\:]', '', title)[:31] or 'Sheet'
            n = 2
            while t in sheets:
                t = f'{t[:28]}~{n}'
                n += 1
            sheets.add(t)
            return wb.create_sheet(t)
        ps = sheet('People')
        ps.append(['email', 'name', 'role', 'active', 'last_sign_in'])
        for p in people:
            ps.append(list(p.values()))
        for label, (names, rows) in tables.items():
            s = sheet(label.split('.', 1)[-1])
            s.append(names)
            for r in rows:
                s.append([json.dumps(v) if isinstance(v, (dict, list)) else v for v in r])
        wb.save(buf)
        return buf.getvalue(), f'{base}.xlsx', manifest
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        if fmt == 'json':
            data = {label: [dict(zip(names, r)) for r in rows] for label, (names, rows) in tables.items()}
            data['people'] = people
            zf.writestr('data.json', json.dumps(data, indent=1, default=str))
        else:
            for label, (names, rows) in tables.items():
                out = io.StringIO()
                w = csv.writer(out)
                w.writerow(names)
                for r in rows:
                    w.writerow([json.dumps(v) if isinstance(v, (dict, list)) else ('' if v is None else v) for v in r])
                zf.writestr(f'{label}.csv', '﻿' + out.getvalue())
            out = io.StringIO()
            w = csv.writer(out)
            w.writerow(['email', 'name', 'role', 'active', 'last_sign_in'])
            for p in people:
                w.writerow(list(p.values()))
            zf.writestr('people.csv', '﻿' + out.getvalue())
        manifest['files_included'] = _add_files(zf, files)
        zf.writestr('manifest.json', json.dumps(manifest, indent=2))
        zf.writestr('README.txt', (
            f'Export of {school.name} ({school.tenant_code}), {manifest["exported_at"]}.\n\n'
            'Each file holds one kind of record; the first row names the columns. IDs link records to each other\n'
            '(for example an invoice\'s student_id is the id of a row in education_students.Student).\n'
            'people lists everyone who could sign in. files/ holds uploaded documents and photos.\n'
            'Passwords, sign-in secrets and integration keys are never exported.\n'))
    return buf.getvalue(), f'{base}.zip', manifest


# ---- Deletion ---------------------------------------------------------------------------------------------------

def purge(school, deletion, *, by: str):
    """Delete everything the school owns. Keeps an empty, inactive school row (for platform invoices and the proof)."""
    from django.core.files.storage import default_storage

    from services.core.audit.models import AuditLog
    from services.core.security.access import school_people
    from services.core.security.models import SignInEvent
    from services.core.tenants.models import TenantMembership

    from .models import SchoolExport

    User = get_user_model()
    people = list(school_people(school))
    sets = list(school_querysets(school))
    files = []
    for _label, Model, qs in sets:
        files += _file_names(Model, qs)
    files += [n for n in SchoolExport.objects.filter(school=school).values_list('file', flat=True) if n]
    counts = {}
    with transaction.atomic():
        remaining = sets
        for _attempt in range(8):  # protected links clear once the records pointing at them are gone
            blocked = []
            for label, Model, qs in remaining:
                try:
                    with transaction.atomic():
                        _total, per_model = qs.delete()
                    for k, n in per_model.items():
                        if n:
                            counts[k] = counts.get(k, 0) + n
                except (ProtectedError, IntegrityError):
                    blocked.append((label, Model, qs))
            if not blocked:
                break
            remaining = blocked
        else:
            raise RuntimeError('Some records could not be deleted: ' + ', '.join(label for label, *_ in remaining))
        for label, qs in (('audit.AuditLog', AuditLog.objects.filter(school=school)),
                          ('core_security.SignInEvent', SignInEvent.objects.filter(school=school)),
                          ('core_portability.SchoolExport', SchoolExport.objects.filter(school=school))):
            n = qs.delete()[0]
            if n:
                counts[label] = n
        TenantMembership.objects.filter(school=school).delete()
        users = 0
        for u in User.objects.filter(pk__in=people, is_superuser=False):
            if TenantMembership.objects.filter(user=u).exists():
                continue  # also works at another school
            u.delete()
            users += 1
        code = school.tenant_code
        school.name = f'Deleted school ({code})'
        school.is_active = False
        school.subdomain = f'deleted-{code.lower()}-{str(school.pk)[:8]}'
        school.settings_json = {'deleted': True, 'deleted_at': timezone.now().isoformat()}
        school.save()
        deletion.status, deletion.completed_at, deletion.completed_by = 'done', timezone.now(), by
        deletion.counts, deletion.users_deleted = counts, users
        # Only these fields: the requester's account may have just been deleted (the link is cleared by the database).
        deletion.save(update_fields=['status', 'completed_at', 'completed_by', 'counts', 'users_deleted'])

    deleted_files = 0
    for name in set(files):
        try:
            if default_storage.exists(name):
                default_storage.delete(name)
                deleted_files += 1
        except Exception:
            pass
    deletion.files_deleted = deleted_files
    deletion.save(update_fields=['files_deleted'])
    return deletion
