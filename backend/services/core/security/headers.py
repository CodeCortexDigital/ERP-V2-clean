"""Extra browser protection headers on every response (P6).

API answers (JSON, files) never need to run scripts, load anything or be shown in a frame, so they get the strictest
Content-Security-Policy. HTML pages served by Django itself (the admin and the API docs) load their own scripts and
styles, so they get a policy that allows only this site. The web app's own headers are set by the host (vercel.json).
"""
API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
PAGE_CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; "
            "font-src 'self' data: https://cdn.jsdelivr.net; frame-ancestors 'none'; base-uri 'self'; object-src 'none'")
PERMISSIONS = 'camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()'


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if 'Content-Security-Policy' not in response:
            html = response.get('Content-Type', '').startswith('text/html')
            response['Content-Security-Policy'] = PAGE_CSP if html else API_CSP
        response.setdefault('Permissions-Policy', PERMISSIONS)
        return response
