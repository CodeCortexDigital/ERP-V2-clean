"""
Redis cache utilities: key builders, decorators, invalidation, and Prometheus metrics.
"""
from __future__ import annotations

import hashlib
import json
import logging
from functools import wraps
from typing import Any, Callable

from django.conf import settings
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

logger = logging.getLogger(__name__)

# TTLs (seconds) — override via settings.CACHE_TIMEOUTS
DEFAULT_TIMEOUTS = {
    'student_list': 300,       # 5 minutes
    'class_list': 3600,        # 1 hour
    'dashboard': 60,           # 1 minute
    'analytics': 900,          # 15 minutes
    'dropdown': 86400,         # 1 day
}


def get_timeout(name: str) -> int:
    timeouts = getattr(settings, 'CACHE_TIMEOUTS', {})
    merged = {**DEFAULT_TIMEOUTS, **timeouts}
    return merged.get(name, 300)


class CacheKeys:
    """Centralized cache key prefixes."""

    STUDENT_LIST = 'student_list'
    CLASS_LIST = 'class_list'
    DASHBOARD = 'dashboard'
    ANALYTICS = 'analytics'
    DROPDOWN = 'dropdown'

    @staticmethod
    def student_list(user_id: str, query_string: str = '') -> str:
        qhash = hashlib.md5(query_string.encode()).hexdigest()[:12]
        return f'{CacheKeys.STUDENT_LIST}:{user_id}:{qhash}'

    @staticmethod
    def class_list(user_id: str, query_string: str = '') -> str:
        qhash = hashlib.md5(query_string.encode()).hexdigest()[:12]
        return f'{CacheKeys.CLASS_LIST}:{user_id}:{qhash}'

    @staticmethod
    def dashboard(name: str, user_id: str) -> str:
        return f'{CacheKeys.DASHBOARD}:{name}:{user_id}'

    @staticmethod
    def analytics(endpoint: str, user_id: str, query_string: str = '') -> str:
        qhash = hashlib.md5(query_string.encode()).hexdigest()[:12]
        return f'{CacheKeys.ANALYTICS}:{endpoint}:{user_id}:{qhash}'

    @staticmethod
    def dropdown(option_type: str, tenant_id: str = 'global') -> str:
        return f'{CacheKeys.DROPDOWN}:{option_type}:{tenant_id}'


# Prometheus metrics (optional — skipped if prometheus_client missing)
try:
    from prometheus_client import Counter, Gauge

    cache_hits_total = Counter('cache_hits_total', 'Cache hits', ['cache_type'])
    cache_misses_total = Counter('cache_misses_total', 'Cache misses', ['cache_type'])
    cache_memory_used_bytes = Gauge('redis_memory_used_bytes', 'Redis memory used')
    cache_memory_peak_bytes = Gauge('redis_memory_peak_bytes', 'Redis memory peak')
    _PROMETHEUS = True
except ImportError:
    _PROMETHEUS = False


class CacheMetrics:
    """Record cache hit/miss and Redis memory usage."""

    @staticmethod
    def record_hit(cache_type: str) -> None:
        if _PROMETHEUS:
            cache_hits_total.labels(cache_type=cache_type).inc()

    @staticmethod
    def record_miss(cache_type: str) -> None:
        if _PROMETHEUS:
            cache_misses_total.labels(cache_type=cache_type).inc()

    @staticmethod
    def update_redis_memory() -> None:
        if not _PROMETHEUS:
            return
        try:
            from django_redis import get_redis_connection
            client = get_redis_connection('default')
            info = client.info('memory')
            cache_memory_used_bytes.set(info.get('used_memory', 0))
            cache_memory_peak_bytes.set(info.get('used_memory_peak', 0))
        except Exception as exc:
            logger.debug('Redis memory metrics unavailable: %s', exc)


def _delete_pattern(pattern: str) -> int:
  """Delete keys matching pattern (django-redis) or best-effort clear."""
  deleted = 0
  if hasattr(cache, 'delete_pattern'):
    deleted = cache.delete_pattern(pattern)
  elif hasattr(cache, 'keys'):
    for key in cache.keys(pattern):
      cache.delete(key)
      deleted += 1
  return deleted


def invalidate_student_cache() -> int:
  """Clear all student list caches."""
  return _delete_pattern(f'*{CacheKeys.STUDENT_LIST}*')


def invalidate_class_cache() -> int:
  """Clear all class list caches."""
  return _delete_pattern(f'*{CacheKeys.CLASS_LIST}*')


def invalidate_dashboard_cache() -> int:
  return _delete_pattern(f'*{CacheKeys.DASHBOARD}*')


def invalidate_analytics_cache() -> int:
  return _delete_pattern(f'*{CacheKeys.ANALYTICS}*')


def invalidate_dropdown_cache(option_type: str | None = None) -> int:
  if option_type:
    return _delete_pattern(f'*{CacheKeys.DROPDOWN}:{option_type}*')
  return _delete_pattern(f'*{CacheKeys.DROPDOWN}*')


def cache_get_or_set(key: str, producer: Callable[[], Any], timeout: int, cache_type: str) -> Any:
  """Get from cache or compute, tracking hit/miss metrics."""
  cached = cache.get(key)
  if cached is not None:
    CacheMetrics.record_hit(cache_type)
    return cached
  CacheMetrics.record_miss(cache_type)
  value = producer()
  cache.set(key, value, timeout)
  return value


def cached_api_view(timeout: int | None = None, cache_type: str = 'api', key_func: Callable | None = None):
  """
  Cache DRF function view responses (stores serializable response data).

  Example:
      @cached_api_view(timeout=get_timeout('analytics'), cache_type='analytics')
      def my_view(request): ...
  """

  def decorator(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
      user_id = str(getattr(request.user, 'id', 'anon'))
      qs = request.META.get('QUERY_STRING', '')
      if args or kwargs:
          extra = ':'.join([str(a) for a in args] + [f'{k}={v}' for k, v in sorted(kwargs.items())])
          qs = f'{qs}&_path={extra}' if qs else f'_path={extra}'
      if key_func:
        key = key_func(request, *args, **kwargs)
      elif cache_type == 'student_list':
        key = CacheKeys.student_list(user_id, qs)
      elif cache_type == 'class_list':
        key = CacheKeys.class_list(user_id, qs)
      elif cache_type == 'dashboard':
        key = CacheKeys.dashboard(view_func.__name__, user_id)
      else:
        key = CacheKeys.analytics(view_func.__name__, user_id, qs)

      ttl = timeout if timeout is not None else get_timeout(cache_type)

      def produce():
        response = view_func(request, *args, **kwargs)
        if hasattr(response, 'data'):
          return response.data
        return response

      data = cache_get_or_set(key, produce, ttl, cache_type)
      from rest_framework.response import Response
      return Response(data)

    return wrapper

  return decorator


def cache_page_analytics(view_func):
  """@cache_page(60*15) wrapper for analytics views (15 minutes)."""
  return cache_page(get_timeout('analytics'), key_prefix='analytics')(view_func)


def cache_page_dashboard(view_func):
  """Dashboard cache — 1 minute."""
  return cache_page(get_timeout('dashboard'), key_prefix='dashboard')(view_func)


class CachedListResponseMixin:
  """
  Mixin for DRF ListAPIView — caches list() response data.

  Set cache_type and cache_key_prefix on the view class.
  """

  cache_type: str = 'student_list'
  cache_key_prefix: str = CacheKeys.STUDENT_LIST

  def get_cache_key(self) -> str:
    user_id = str(getattr(self.request.user, 'id', 'anon'))
    qs = self.request.META.get('QUERY_STRING', '')
    if self.cache_key_prefix == CacheKeys.STUDENT_LIST:
      return CacheKeys.student_list(user_id, qs)
    if self.cache_key_prefix == CacheKeys.CLASS_LIST:
      return CacheKeys.class_list(user_id, qs)
    qhash = hashlib.md5(qs.encode()).hexdigest()[:12]
    return f'{self.cache_key_prefix}:{user_id}:{qhash}'

  def list(self, request, *args, **kwargs):
    key = self.get_cache_key()
    ttl = get_timeout(self.cache_type)

    cached = cache.get(key)
    if cached is not None:
      CacheMetrics.record_hit(self.cache_type)
      from rest_framework.response import Response
      return Response(cached)

    CacheMetrics.record_miss(self.cache_type)
    response = super().list(request, *args, **kwargs)
    cache.set(key, response.data, ttl)
    return response


def get_dropdown_options(option_type: str, tenant_id: str = 'global') -> dict:
  """
  Cached dropdown/select options (classes, sections, subjects).
  TTL: 1 day.
  """
  key = CacheKeys.dropdown(option_type, tenant_id)

  def produce():
    from django.apps import apps
    SchoolClass = apps.get_model('education_academics', 'SchoolClass')
    Section = apps.get_model('education_academics', 'Section')
    Subject = apps.get_model('education_academics', 'Subject')
    AcademicYear = apps.get_model('education_academics', 'AcademicYear')

    if option_type == 'classes':
      items = list(
        SchoolClass.objects.values('id', 'name', 'code').order_by('name')
      )
    elif option_type == 'sections':
      items = list(
        Section.objects.select_related('class_ref')
        .values('id', 'name', 'class_ref_id', 'class_ref__name')
        .order_by('class_ref__name', 'name')
      )
    elif option_type == 'subjects':
      items = list(Subject.objects.values('id', 'name', 'code').order_by('name'))
    elif option_type == 'academic_years':
      items = list(
        AcademicYear.objects.values('id', 'name', 'is_active').order_by('-start_date')
      )
    else:
      items = []

    for row in items:
      for k, v in row.items():
        if hasattr(v, 'hex'):
          row[k] = str(v)
    return {'type': option_type, 'options': items}

  return cache_get_or_set(key, produce, get_timeout('dropdown'), 'dropdown')


def cache_metrics_view(request):
  """Prometheus metrics for cache hit/miss and Redis memory."""
  from django.http import HttpResponse
  CacheMetrics.update_redis_memory()
  if _PROMETHEUS:
    from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
    return HttpResponse(generate_latest(), content_type=CONTENT_TYPE_LATEST)
  return HttpResponse('# prometheus_client not installed\n', content_type='text/plain')
