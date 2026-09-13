"""C-2 — um HTTPException levantado dentro de um try não pode virar 500."""
import ast
import inspect
import pathlib

import pytest

SRC_DIR = pathlib.Path(__file__).resolve().parents[2] / "src"

# Arq-B (M5) moveu as 34 rotas de app.py (156 linhas hoje, 0 rotas) para
# routers/*.py e services/*.py — varrer só app.py deixava este portão
# vazio e vacuamente verde (achado do Revisor, DEC-088). Mesmo padrão já
# usado em test_cpu_bound_to_thread.py/test_vazamento_de_erro.py.
ARQUIVOS_VARRIDOS = [
    SRC_DIR / "app.py",
    *sorted((SRC_DIR / "routers").glob("*.py")),
    *sorted(p for p in (SRC_DIR / "services").glob("*.py") if p.name != "__init__.py"),
]


@pytest.mark.security
@pytest.mark.parametrize("caminho", ARQUIVOS_VARRIDOS, ids=lambda p: p.name)
def test_nenhum_try_engole_httpexception(caminho):
    tree = ast.parse(caminho.read_text(encoding="utf-8"))
    funcs = sorted(
        (n.lineno, n.name) for n in ast.walk(tree)
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    ofensores = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Try) or not node.handlers:
            continue
        levanta_http = any(
            isinstance(n, ast.Raise) and isinstance(n.exc, ast.Call)
            and getattr(n.exc.func, "id", "") == "HTTPException"
            for n in ast.walk(node)
        )
        if not levanta_http:
            continue
        reraise = any(
            h.type is not None and getattr(h.type, "id", "") == "HTTPException"
            for h in node.handlers
        )
        generico = any(
            h.type is None or getattr(h.type, "id", "") == "Exception"
            for h in node.handlers
        )
        if generico and not reraise:
            dono = max((f for f in funcs if f[0] <= node.lineno),
                       key=lambda f: f[0], default=(0, "?"))
            ofensores.append(f"{dono[1]} (linha {node.lineno})")
    assert ofensores == [], (
        "try/except Exception sem `except HTTPException: raise` em "
        f"{caminho.name}:\n  " + "\n  ".join(ofensores)
    )


@pytest.mark.parametrize("rota", [
    "/api/tree/projeto-que-nao-existe/insights",
    "/api/gen_plot/projeto-que-nao-existe",
    "/api/tree/pattern-analysis/projeto-que-nao-existe",
    "/api/tree/metadata/projeto-que-nao-existe",
])
async def test_projeto_inexistente_devolve_404_e_nao_500(client, rota):
    r = await client.get(rota)
    assert r.status_code == 404, (
        f"{rota} devolveu {r.status_code}; recurso ausente é 404, não erro de servidor"
    )


async def test_erro_nao_vaza_caminho_do_servidor(client):
    r = await client.get("/api/tree/projeto-que-nao-existe/insights")
    assert "/home/" not in r.text and "Traceback" not in r.text


async def test_ncbi_info_sequencia_nao_encontrada_devolve_404_e_nao_500(client, monkeypatch):
    """Regressão: `get_ncbi_info` (routers/ncbi_router.py) engolia o
    HTTPException(404) num `except Exception` genérico — achado do Revisor
    de Arq-B (DEC-088), corrigido a pedido do usuário. `fetch_ncbi_info_sync`
    devolve `{'error': ...}` quando o NCBI não acha a sequência; sem a
    correção, isso virava 500 em vez de 404."""
    # `from src.routers import ncbi_router` traria o objeto `APIRouter`
    # (routers/__init__.py reexporta `router` sob esse nome), não o módulo —
    # `importlib.import_module` busca direto em `sys.modules` (mesmo padrão
    # de test_limites_entrada.py/test_previa_de_json.py).
    import importlib
    ncbi_router = importlib.import_module("src.routers.ncbi_router")

    monkeypatch.setattr(
        ncbi_router,
        "fetch_ncbi_info_sync",
        lambda identifier: {"error": "Sequência não encontrada no NCBI"},
    )
    r = await client.post("/api/ncbi/info", json={"identifier": "NC_000000_inexistente"})
    assert r.status_code == 404, (
        f"devolveu {r.status_code}; sequência ausente é 404, não erro de servidor"
    )
