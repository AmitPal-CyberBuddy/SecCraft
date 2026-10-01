from starlette.responses import JSONResponse


class FeedbackBodyLimit:
    """Bound bodies before JSON parsing, including chunked requests without Content-Length."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        path = scope.get('path', '')
        if scope['type'] != 'http' or not (
            (scope.get('method') == 'POST' and path.rstrip('/') == '/api/v1/feedback') or
            (scope.get('method') == 'PATCH' and path.startswith('/api/v1/admin/feedback/'))
        ):
            return await self.app(scope, receive, send)
        body = bytearray()
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            chunk = message.get('body', b'')
            if len(body) + len(chunk) > 65536:
                return await JSONResponse({'detail': 'Feedback request is too large.'}, status_code=413)(scope, receive, send)
            body.extend(chunk)
            if not message.get('more_body', False):
                break
        consumed = False

        async def bounded_receive():
            nonlocal consumed
            if not consumed:
                consumed = True
                return {'type': 'http.request', 'body': bytes(body), 'more_body': False}
            return await receive()
        await self.app(scope, bounded_receive, send)
