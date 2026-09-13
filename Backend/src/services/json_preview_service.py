"""Introspecção de JSON grande para pré-visualização paginada (Arq-B/M5).

Movido de `app.py` — cópia literal de `json_root_kind`, `get_json_total_items`
e do cache `json_count_cache`/`json_count_lock`. Serviço não conhece FastAPI:
não levanta `HTTPException` (o chamador em `routers/input_data_router.py`
decide o status a partir do que estas funções devolvem/levantam —
`ijson.JSONError`, não HTTP).
"""
import os
import threading

import ijson

json_count_cache = {}
json_count_lock = threading.Lock()


def json_root_kind(file_path: str) -> str:
    """
    Descobre a forma da raiz de um JSON sem carregá-lo.

    O explorador precisa abrir três coisas diferentes: o `metadata.json`, que é
    uma lista de listas de árvores e tem gigabytes; e os `manifest.json` e
    `config_backup.json`, que são objetos de poucos KB. Antes, a paginação era
    fixa no prefixo `item.item` e **todo JSON que não fosse lista de listas
    devolvia 404 dizendo que o arquivo estava vazio** — que é o oposto do que
    acontecia.

    Lê apenas os dois primeiros eventos do parser incremental, então o custo
    independe do tamanho do arquivo.

    Return
    ------
    str
        ``"object"``, ``"array_of_arrays"``, ``"array"``, ``"scalar"``,
        ``"empty"`` (arquivo vazio ou só espaços) ou ``"invalid"`` (não é JSON).
        Arquivo malformado é um estado próprio, e não um 500: o explorador
        precisa dizer ao usuário o que há de errado com o arquivo.
    """
    if os.path.getsize(file_path) == 0:
        return "empty"

    with open(file_path, 'rb') as f:
        eventos = ijson.parse(f)
        try:
            _, primeiro, _ = next(eventos)
        except StopIteration:
            return "empty"
        except ijson.JSONError:
            return "invalid"

        if primeiro == "start_map":
            return "object"
        if primeiro != "start_array":
            return "scalar"

        try:
            _, segundo, _ = next(eventos)
        except StopIteration:
            return "array"
        except ijson.JSONError:
            return "invalid"
        return "array_of_arrays" if segundo == "start_array" else "array"


def get_json_total_items(file_path: str, prefixo: str = "item.item"):
    """
    Obtém o total de itens de um JSON iterável.
    Usa cache baseado no tempo de modificação do arquivo para evitar reprocessamento.
    """
    file_mtime = os.path.getmtime(file_path)
    chave = (file_path, prefixo)

    with json_count_lock:
        cache_entry = json_count_cache.get(chave)

        if cache_entry and cache_entry["mtime"] == file_mtime:
            return cache_entry["total_items"]

    total = 0
    with open(file_path, 'rb') as f:
        for _ in ijson.items(f, prefixo):
            total += 1

    with json_count_lock:
        json_count_cache[chave] = {
            "mtime": file_mtime,
            "total_items": total
        }

    return total
