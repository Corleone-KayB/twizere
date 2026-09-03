from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..ws_manager import manager

router = APIRouter()


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # No client->server messages are required; just drain/ignore
            # incoming frames so we notice a disconnect.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
