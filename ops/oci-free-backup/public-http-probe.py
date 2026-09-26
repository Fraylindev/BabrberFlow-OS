"""Public transport checks; no cookies, credentials, redirects or response bodies."""
import os
import re
import ssl
import time
import urllib.error
import urllib.request

TARGETS = (
    ('public_web', 'https://booking.kortek.cloud/', 200, False),
    ('public_api', 'https://api.booking.kortek.cloud/', 404, True),
)
REQUEST_ID = re.compile(r'^[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def secure_opener(context=None):
    # No proxy credentials or implicit proxy from the process environment.
    return urllib.request.build_opener(
        urllib.request.ProxyHandler({}), NoRedirect(),
        urllib.request.HTTPSHandler(context=context or ssl.create_default_context()))


def probe(url, status, request_id, opener):
    started = time.monotonic()
    up = 0
    request = urllib.request.Request(url, method='GET', headers={
        'User-Agent': 'Kortek-Public-Uptime/1', 'Accept': '*/*',
    })
    try:
        with opener.open(request, timeout=3) as response:
            up = int(response.status == status and (
                not request_id or bool(REQUEST_ID.fullmatch(response.headers.get('X-Request-Id', '')))))
    except urllib.error.HTTPError as error:
        try:
            up = int(error.code == status and (
                not request_id or bool(REQUEST_ID.fullmatch(error.headers.get('X-Request-Id', '')))))
        finally:
            error.close()
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        # Error strings can contain URLs/private infrastructure. Never export them.
        pass
    return up, round((time.monotonic() - started) * 1000, 2)


def metrics(env, opener=None):
    flag = env.get('KORTEK_PUBLIC_HTTP_ENABLED', 'false')
    if flag not in ('true', 'false'):
        raise ValueError('PUBLIC_HTTP_MONITOR_CONFIGURATION_INVALID')
    result = {'public_http_monitor_enabled': int(flag == 'true')}
    if flag == 'false':
        return result
    opener = opener or secure_opener()
    for name, url, status, request_id in TARGETS:
        up, duration = probe(url, status, request_id, opener)
        result[name + '_up'] = up
        result[name + '_duration_ms'] = duration
    return result


if __name__ == '__main__':
    for metric, value in metrics(os.environ).items():
        print(metric, value)
