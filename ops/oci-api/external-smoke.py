#!/usr/bin/env python3
"""Run on an external operator machine: real DNS and public CA, no VM tunnel."""
import datetime
import json
import re
import socket
import ssl
import urllib.error
import urllib.request

API = 'https://api.booking.kortek.cloud'
WEB = 'https://booking.kortek.cloud'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


opener = urllib.request.build_opener(
    urllib.request.ProxyHandler({}), NoRedirect(),
    urllib.request.HTTPSHandler(context=ssl.create_default_context()))


def check(path='/', method='GET', headers=None, base=API):
    req = urllib.request.Request(base + path, method=method, headers=headers or {})
    try:
        response = opener.open(req, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read(4096)


def main():
    host = 'api.booking.kortek.cloud'
    addresses = sorted({row[4][0] for row in socket.getaddrinfo(host, 443)})
    assert '150.136.7.19' in addresses
    context = ssl.create_default_context()
    with socket.create_connection((host, 443), timeout=15) as raw:
        with context.wrap_socket(raw, server_hostname=host) as tls:
            cert = tls.getpeercert()
            assert ('DNS', host) in cert['subjectAltName']
            tls_version = tls.version()
    status, headers, body = check()
    assert status == 404
    assert re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}',
                        headers.get('X-Request-Id', ''), re.I)
    assert json.loads(body)['statusCode'] == 404
    assert headers.get('Strict-Transport-Security')
    root = dict(status=status, requestId=headers['X-Request-Id'],
                body=json.loads(body))
    status, headers, _ = check(base='http://' + host)
    assert status == 308 and headers.get('Location') == API + '/'
    status, _, body = check('/professionals')
    assert status == 401
    assert json.loads(body)['statusCode'] == 401
    cors = []
    for origin in (WEB, 'http://localhost:3000', 'https://untrusted.example', '*'):
        status, headers, _ = check(method='OPTIONS', headers={
            'Origin': origin, 'Access-Control-Request-Method': 'GET'})
        allowed = headers.get('Access-Control-Allow-Origin')
        if origin == WEB:
            assert status == 204 and allowed == WEB
            assert headers.get('Access-Control-Allow-Credentials') == 'true'
        else:
            assert allowed is None
        cors.append(dict(origin=origin, status=status, allowOrigin=allowed))
    ports = {}
    for port in (3000, 2019):
        try:
            connection = socket.create_connection((host, port), timeout=3)
        except OSError:
            ports[str(port)] = 'unreachable'
        else:
            connection.close()
            raise AssertionError('Private port reachable')
    print(json.dumps(dict(event='EXTERNAL_HTTPS_SMOKE_OK',
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        runner='external-operator-machine', dns=addresses, tlsVersion=tls_version,
        certificate=dict(issuer=cert['issuer'], notBefore=cert['notBefore'],
                         notAfter=cert['notAfter'], subjectAltName=cert['subjectAltName']),
        root=root, privateRouteStatus=401, httpRedirectStatus=308,
        cors=cors, privatePorts=ports), indent=2))


if __name__ == '__main__':
    main()
