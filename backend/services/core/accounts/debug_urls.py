import django
django.setup()
from django.urls import get_resolver
from django.urls.resolvers import URLPattern, URLResolver

def list_urls():
    resolver = get_resolver()
    urls = []
    
    def collect_urls(resolver, prefix=''):
        for pattern in resolver.url_patterns:
            if hasattr(pattern, 'url_patterns'):  # It's a resolver
                new_prefix = prefix + str(pattern.pattern)
                collect_urls(pattern, new_prefix)
            else:  # It's a pattern
                urls.append(prefix + str(pattern.pattern))
    
    collect_urls(resolver)
    return urls

if __name__ == '__main__':
    print("Registered URLs:")
    for url in sorted(list_urls()):
        print(f"  {url}")