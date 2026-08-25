"""C-2 — um HTTPException levantado dentro de um try não pode virar 500."""
import ast
import inspect
import pathlib

import pytest

APP_PATH = pathlib.Path(__file__).resolve().parents[2] / "src" / "app.py"


@pytest.mark.security
def test_nenhum_try_engole_httpexception():
    tree = ast.parse(APP_PATH.read_text(encoding="utf-8"))
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
        "try/except Exception sem `except HTTPException: raise` em:\n  "
        + "\n  ".join(ofensores)
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
