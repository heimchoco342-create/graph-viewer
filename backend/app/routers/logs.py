"""WebSocket endpoint for real-time log streaming."""
from __future__ import annotations

import asyncio
import logging
from collections import deque

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# ── In-memory log buffer + broadcast ────────────────────────

MAX_BUFFER = 200  # keep last N lines for new connections

_buffer: deque[str] = deque(maxlen=MAX_BUFFER)
_clients: set[WebSocket] = set()


class WebSocketLogHandler(logging.Handler):
    """Logging handler that pushes formatted records to all connected WebSocket clients."""

    def emit(self, record: logging.LogRecord) -> None:
        msg = self.format(record)
        _buffer.append(msg)
        # Schedule broadcast (non-blocking)
        for ws in list(_clients):
            try:
                asyncio.get_event_loop().create_task(_send(ws, msg))
            except RuntimeError:
                pass  # no running loop yet


async def _send(ws: WebSocket, msg: str) -> None:
    try:
        await ws.send_text(msg)
    except Exception:
        _clients.discard(ws)


def install_log_handler() -> None:
    """Attach the WebSocket handler to the root logger and uvicorn loggers."""
    handler = WebSocketLogHandler()
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)-7s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    ))
    handler.setLevel(logging.DEBUG)

    # Root logger
    root = logging.getLogger()
    root.addHandler(handler)
    root.setLevel(logging.INFO)

    # Uvicorn access + error loggers
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error", "app"):
        lg = logging.getLogger(name)
        lg.addHandler(handler)
        lg.setLevel(logging.INFO)


# ── WebSocket endpoint ─────────────────────────────────────

@router.websocket("/ws/logs")
async def ws_logs(websocket: WebSocket):
    await websocket.accept()
    _clients.add(websocket)
    try:
        # Send buffered history
        for line in _buffer:
            await websocket.send_text(line)
        # Keep alive — wait for client disconnect
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(websocket)
