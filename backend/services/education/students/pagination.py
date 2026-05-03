from rest_framework.pagination import PageNumberPagination, LimitOffsetPagination, CursorPagination
from rest_framework.response import Response
from collections import OrderedDict
from .constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PAGE_SIZES

class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination with page size parameter"""
    page_size = DEFAULT_PAGE_SIZE
    page_size_query_param = 'page_size'
    max_page_size = MAX_PAGE_SIZE
    page_query_param = 'page'
    
    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('page_size', self.get_page_size(self.request)),
            ('results', data)
        ]))

class LargeResultsSetPagination(PageNumberPagination):
    """Pagination for large result sets"""
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000

class SmallResultsSetPagination(PageNumberPagination):
    """Pagination for small result sets"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

class CustomLimitOffsetPagination(LimitOffsetPagination):
    """Limit-offset pagination"""
    default_limit = DEFAULT_PAGE_SIZE
    limit_query_param = 'limit'
    offset_query_param = 'offset'
    max_limit = MAX_PAGE_SIZE
    
    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('limit', self.limit),
            ('offset', self.offset),
            ('results', data)
        ]))

class StudentPagination(PageNumberPagination):
    """Specialized pagination for students with summary statistics"""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200
    
    def get_paginated_response(self, data):
        from .models import Student
        
        queryset = Student.objects.filter(is_deleted=False)
        summary = {
            'total': queryset.count(),
            'active': queryset.filter(status='active').count(),
            'graduated': queryset.filter(status='graduated').count(),
            'international': queryset.filter(is_international=True).count(),
        }
        
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('page_size', self.get_page_size(self.request)),
            ('summary', summary),
            ('results', data)
        ]))

class CursorPaginator(CursorPagination):
    """Cursor-based pagination for infinite scrolling"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    ordering = '-created_at'

class AlphabeticalPagination(PageNumberPagination):
    """Pagination with alphabetical grouping"""
    page_size = 50
    page_size_query_param = 'page_size'
    
    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        
        # Add alphabetical index
        from .models import Student
        first_letters = Student.objects.filter(
            is_deleted=False
        ).values_list('last_name__0', flat=True).distinct().order_by('last_name__0')
        
        response.data['alphabetical_index'] = list(first_letters)
        
        return response