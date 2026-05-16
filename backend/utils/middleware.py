"""
Global middleware: request logging, execution timing, and exception handling.
"""
import time
import logging
import traceback
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("memorytwin.middleware")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log every request with method, path, status code, and duration."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.time()
        method = request.method
        path = request.url.path

        try:
            response = await call_next(request)
            duration_ms = round((time.time() - start) * 1000, 2)
            status = response.status_code
            level = logging.WARNING if status >= 400 else logging.INFO
            logger.log(level, f"{method} {path} → {status} [{duration_ms}ms]")
            response.headers["X-Process-Time"] = str(duration_ms)
            return response
        except Exception as exc:
            duration_ms = round((time.time() - start) * 1000, 2)
            logger.error(f"{method} {path} → 500 [{duration_ms}ms] | {exc}")
            raise


class GlobalExceptionMiddleware(BaseHTTPMiddleware):
    """Catch unhandled exceptions and return structured JSON error responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            logger.error(
                f"Unhandled exception on {request.method} {request.url.path}:\n"
                f"{traceback.format_exc()}"
            )
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "An internal server error occurred.",
                    "detail": str(exc),
                    "path": str(request.url.path),
                },
            )
