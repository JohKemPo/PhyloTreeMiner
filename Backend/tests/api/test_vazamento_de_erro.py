"""M4.2/M4.3 — nenhum `detail=` de HTTPException pode interpolar a exceção capturada (S-4).

`detail=f"...{e}"` ou `detail=str(e)` devolve ao cliente texto interno (mensagem
de biblioteca, caminho de arquivo, traceback resumido). A varredura é AST, não
grep, para não depender de formatação: percorre toda chamada a `HTTPException(...)`,
acha o argumento `detail` e reprova se ele referencia, em qualquer nível da
expressão, o nome ligado pelo `except ... as <nome>` que a envolve.
"""
import ast
import pathlib

import pytest

BACKEND_DIR = pathlib.Path(__file__).resolve().parents[2]

ARQUIVOS_VARRIDOS = [
    BACKEND_DIR / "src" / "app.py",
    *sorted((BACKEND_DIR / "src" / "routers").glob("*.py")),
    BACKEND_DIR / "src" / "services" / "cql_batch_service.py",
]


def _nomes_de_excecao_capturados(tree: ast.AST) -> dict:
    """Mapeia cada `ast.Try` para o conjunto de nomes que seus handlers capturam."""
    capturas = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Try):
            capturas[node] = {h.name for h in node.handlers if h.name}
    return capturas


def _referencia_nome(expr: ast.AST, nomes: set) -> bool:
    return any(isinstance(n, ast.Name) and n.id in nomes for n in ast.walk(expr))


def _ofensores(caminho: pathlib.Path):
    codigo = caminho.read_text(encoding="utf-8")
    tree = ast.parse(codigo, filename=str(caminho))
    capturas = _nomes_de_excecao_capturados(tree)

    # Para cada Try, o conjunto de nomes de exceção que envolve qualquer nó dentro dele.
    nomes_por_no = {}
    for try_node, nomes in capturas.items():
        if not nomes:
            continue
        for filho in ast.walk(try_node):
            nomes_por_no.setdefault(id(filho), set()).update(nomes)

    achados = []
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call) and getattr(node.func, "id", "") == "HTTPException"):
            continue
        for kw in node.keywords:
            if kw.arg != "detail":
                continue
            nomes = nomes_por_no.get(id(kw.value), set())
            if nomes and _referencia_nome(kw.value, nomes):
                achados.append(f"{caminho.relative_to(BACKEND_DIR)}:{node.lineno}")
    return achados


@pytest.mark.security
@pytest.mark.parametrize("caminho", ARQUIVOS_VARRIDOS, ids=lambda p: str(p.name))
def test_detail_nao_interpola_excecao_capturada(caminho):
    assert caminho.exists(), f"arquivo esperado não encontrado: {caminho}"
    achados = _ofensores(caminho)
    assert achados == [], (
        "detail= de HTTPException interpola a exceção capturada em:\n  "
        + "\n  ".join(achados)
    )
