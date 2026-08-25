"""S-2 — contenção de caminho. Cada teste corresponde a um vetor da auditoria."""
import os
import pytest
from fastapi import HTTPException


@pytest.fixture
def resolve_within(app_module):
    fn = getattr(app_module, "resolve_within", None)
    if fn is None:
        pytest.fail(
            "app.resolve_within não existe. O log declara S-2 aplicado, mas a "
            "função está apenas no diretório órfão .claude/worktrees/. Ver "
            "docs/automation/08-ficha-de-fatos.md §2."
        )
    return fn


@pytest.mark.security
def test_caminho_dentro_da_base_e_aceito(resolve_within, tmp_path):
    base = tmp_path / "projects"
    (base / "meu_projeto").mkdir(parents=True)
    assert resolve_within(str(base), "meu_projeto") == str(base / "meu_projeto")


@pytest.mark.security
@pytest.mark.parametrize("vetor", [
    "../etc/passwd",
    "../../etc/passwd",
    "..",
    "a/../../b",
    "/etc/passwd",
])
def test_escapes_sao_recusados_com_403(resolve_within, tmp_path, vetor):
    base = tmp_path / "projects"
    base.mkdir()
    with pytest.raises(HTTPException) as exc:
        resolve_within(str(base), vetor)
    assert exc.value.status_code == 403


@pytest.mark.security
def test_irmao_com_prefixo_comum_e_recusado(resolve_within, tmp_path):
    """O bug que `startswith` não pega: /base/projects_x começa com /base/projects
    mas está fora dele."""
    base = tmp_path / "projects"
    base.mkdir()
    (tmp_path / "projects_x").mkdir()
    with pytest.raises(HTTPException) as exc:
        resolve_within(str(base), "../projects_x")
    assert exc.value.status_code == 403


@pytest.mark.security
def test_startswith_fraco_nao_sobrevive_em_app(app_module):
    """Nenhum caminho de contenção deve usar a comparação de prefixo."""
    import inspect
    fonte = inspect.getsource(app_module)
    ofensores = [
        linha.strip()
        for linha in fonte.splitlines()
        if ".startswith(PROJECTS_ROOT" in linha and not linha.strip().startswith("#")
    ]
    assert ofensores == [], (
        "contenção por prefixo ainda presente:\n  " + "\n  ".join(ofensores)
    )
