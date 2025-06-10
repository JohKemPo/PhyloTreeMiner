from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = set()
running = False

@app.post("/configure")
async def configure(config: dict):
    return {"status": "configured", "config": config}

@app.post("/start")
async def start(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_workflow)
    return {"status": "started"}

@app.post("/cancel")
async def cancel():
    global running
    running = False
    return {"status": "canceled"}

async def run_workflow():
    global running
    running = True
    progress = 0
    while running and progress <= 100:
        await broadcast({"progress": progress})
        await asyncio.sleep(1)
        progress += 10
    if running:
        await broadcast({"status": "completed"})
    running = False

async def broadcast(message: dict):
    to_remove = set()
    for ws in set(clients):
        try:
            await ws.send_json(message)
        except WebSocketDisconnect:
            to_remove.add(ws)
    clients.difference_update(to_remove)

@app.websocket("/ws/progress")
async def progress_ws(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.discard(websocket)
