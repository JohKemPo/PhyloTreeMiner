from fastapi import FastAPI, WebSocketDisconnect, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict
from glob import glob
import os, datetime


PATH_BASE_WORKFLOW="../../BioComp_UFF"


app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:8080",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Permite todos os métodos (GET, POST, etc.)
    allow_headers=["*"], # Permite todos os cabeçalhos
)

class ConnectionManager:
    """
    Gerencia as conexões WebSocket ativas.
    
    Permite conectar, desconectar e enviar mensagens para clientes específicos.
    
    Atributos:
        active_connections (Dict[str, WebSocket]): Dicionário que mapeia IDs de clientes para suas conexões WebSocket ativas.
    Métodos:    
        connect(websocket: WebSocket, client_id: str): Aceita uma nova conexão WebSocket e a associa a um ID de cliente.
        disconnect(client_id: str): Desconecta o cliente associado ao ID fornecido.
        send_message(client_id: str, message: str): Envia uma mensagem para o cliente associado ao ID fornecido.
       
    """
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_message(self, client_id: str, message: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)
            
manager = ConnectionManager()

@app.get("/")
async def read_root():
    return {"message": "Bem-vindo à API FastAPI!"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    Gerencia a conexão WebSocket e processa mensagens recebidas do cliente.
    Esta função aceita uma conexão WebSocket, recebe mensagens do cliente e envia respostas de volta.
    Se ocorrer um erro durante a comunicação, o cliente é desconectado e uma mensagem de erro é exibida.

    Parâmetros:
        websocket (WebSocket): A conexão WebSocket com o cliente.
        client_id (str): Um identificador único para o cliente, usado para gerenciar conexões.      
    
    Exceções:
        Exception: Se ocorrer um erro durante a recepção de mensagens, o cliente é desconectado e uma mensagem de erro é exibida.
    
    """
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            response_message = f"Você disse: {data}"
            await manager.send_message(client_id, response_message)

    except WebSocketDisconnect:
        print(f"Cliente {client_id} desconectou (WebSocketDisconnect).")
    except Exception as e:
        print(f"Ocorreu um erro com o cliente {client_id}: {e}")
    finally:
        manager.disconnect(client_id)
        print(f"Conexão com {client_id} fechada. Total: {len(manager.active_connections)}")

@app.get("/projects")
async def get_projects() -> List[str]:
    """
    Retorna uma lista de projetos disponíveis no diretório 'projects'.
    
    Retorna:
        List[str]: Lista de nomes de projetos encontrados.
    """
    base_path = os.path.join(PATH_BASE_WORKFLOW, "projects")
    projects = os.listdir(base_path)
    
    timestamp = lambda x: datetime.datetime.fromtimestamp(os.path.getmtime(os.path.join(base_path, x))).isoformat()
    return JSONResponse(content=[{'value': project, 'label': project, "timestamp": timestamp(project)} for project in projects])
    # return JSONResponse(content={i: projetc for i, projetc in enumerate(projects)})