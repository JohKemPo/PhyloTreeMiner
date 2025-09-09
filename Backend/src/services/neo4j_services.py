# services/neo4j_service.py
from neo4j import AsyncGraphDatabase 
import os
from typing import List, Dict, Any
from neo4j.graph import Node, Relationship, Path

class Neo4jService:
    def __init__(self, uri: str = None, username: str = None, password: str = None):
        self.uri = uri or os.getenv('NEO4J_URI', 'neo4j+s://121438fe.databases.neo4j.io')
        self.username = username or os.getenv('NEO4J_USERNAME', 'neo4j')
        self.password = password or os.getenv('NEO4J_PASSWORD', 'E54qKFqiFkMwjNerJ_IfvmjFfhIbTYWXNDoBY5vQ2II')
        self.driver = None
        self.connected = False

    async def connect(self):
        """Estabelece conexão com o banco Neo4j de forma assíncrona."""
        try:
            self.driver = AsyncGraphDatabase.driver(self.uri, auth=(self.username, self.password))
            await self.driver.verify_connectivity()
            self.connected = True
            print("Conectado ao Neo4j (async) com sucesso!")
        except Exception as e:
            self.connected = False
            print(f"Aviso: Não foi possível conectar ao Neo4j: {e}")

    async def close(self):
        """Fecha a conexão com o banco"""
        if self.driver:
            await self.driver.close()

    async def execute_query(self, query: str, parameters: Dict = None) -> List[Dict[str, Any]]:
        """Executa uma consulta Cypher assincronamente."""
        if not self.connected:
            return [] 
        
        async with self.driver.session() as session:
            result = await session.run(query, parameters or {})
            return [record.data() async for record in result]

    async def get_graph_data(self, query: str = None, limit: int = 100) -> Dict[str, Any]:
        """
        Retorna dados do grafo formatados para visualização.
        Esta versão é mais robusta e processa qualquer tipo de retorno 
        (nós, relacionamentos e caminhos).
        """
        if not query:
            query = f"MATCH (n) RETURN n LIMIT {limit}"
        
        if not self.connected:
            return {'nodes': [], 'edges': []}

        nodes = {}
        edges = {}

        async with self.driver.session() as session:
            result = await session.run(query)
            
            async for record in result:
                for value in record.values():
                    if isinstance(value, Path):
                        for path_node in value.nodes:
                            node_id = path_node.element_id
                            if node_id not in nodes:
                                nodes[node_id] = {
                                    'id': node_id,
                                    'label': list(path_node.labels)[0] if path_node.labels else 'Node',
                                    'properties': dict(path_node),
                                    'title': dict(path_node).get('name', node_id)
                                }
                        for rel in value.relationships:
                            edge_id = rel.element_id
                            if edge_id not in edges:
                                edges[edge_id] = {
                                    'id': edge_id,
                                    'from': rel.start_node.element_id,
                                    'to': rel.end_node.element_id,
                                    'label': rel.type,
                                    'properties': dict(rel)
                                }

                    elif isinstance(value, Node):
                        node_id = value.element_id
                        if node_id not in nodes:
                            nodes[node_id] = {
                                'id': node_id,
                                'label': list(value.labels)[0] if value.labels else 'Node',
                                'properties': dict(value),
                                'title': dict(value).get('name', node_id)
                            }
                    
                    elif isinstance(value, Relationship):
                        edge_id = value.element_id
                        if edge_id not in edges:
                            edges[edge_id] = {
                                'id': edge_id,
                                'from': value.start_node.element_id,
                                'to': value.end_node.element_id,
                                'label': value.type,
                                'properties': dict(value)
                            }
                            for related_node in [value.start_node, value.end_node]:
                                node_id = related_node.element_id
                                if node_id not in nodes:
                                    nodes[node_id] = {
                                        'id': node_id,
                                        'label': list(related_node.labels)[0] if related_node.labels else 'Node',
                                        'properties': dict(related_node),
                                        'title': dict(related_node).get('name', node_id)
                                    }
        
        return {'nodes': list(nodes.values()), 'edges': list(edges.values())}
    
    async def update_connection(self, uri: str, username: str, password: str) -> bool:
        """
        Fecha a conexão atual, atualiza os detalhes e tenta reconectar.
        Retorna True se a nova conexão for bem-sucedida, False caso contrário.
        """
        if self.driver:
            await self.close()
        
        self.uri = uri
        self.username = username
        self.password = password
        
        try:
            await self.connect()
            return self.connected
        except Exception as e:
            print(f"Falha ao tentar nova conexão com Neo4j: {e}")
            self.connected = False
            self.driver = None
            return False

neo4j_service = Neo4jService()