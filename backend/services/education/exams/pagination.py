from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict

class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination with page size parameter"""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100
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
    max_page_size = 500

class SmallResultsSetPagination(PageNumberPagination):
    """Pagination for small result sets"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50