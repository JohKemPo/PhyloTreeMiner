"""DELETE /projects/{nome} — exclusão de projeto, ação irreversível.

O menu de ações da UI tinha um item "Delete Project" desabilitado, sem rota
correspondente no backend. Estes testes cobrem o contrato da rota nova:
recusa por nome inválido, projeto inexistente e projeto em execução; sucesso
remove o diretório de verdade.
"""
import json

import pytest


@pytest.fixture
def projeto_descartavel(tmp_path, app_module, monkeypatch):
    """Um projeto mínimo, num `PROJECTS_ROOT` isolado em `tmp_path` — a rota
    apaga de verdade (`shutil.rmtree`), e não deve ser exercitada contra o
    diretório real de projetos."""
    raiz = tmp_path / "projetos"
    nome = "projeto_descartavel"
    caminho = raiz / nome
    (caminho / "out" / "outputs").mkdir(parents=True)
    (caminho / "out" / "outputs" / "manifest.json").write_text(
        json.dumps({"run_id": "x", "started_at_utc": None, "finished_at_utc": None}),
        encoding="utf-8")

    monkeypatch.setattr(app_module, "PROJECTS_ROOT", str(raiz))
    return nome, caminho


async def test_exclui_projeto_existente(client, projeto_descartavel):
    nome, caminho = projeto_descartavel
    resposta = await client.delete(f"/projects/{nome}")
    assert resposta.status_code == 200
    assert not caminho.exists()


async def test_projeto_inexistente_e_404(client, projeto_descartavel):
    resposta = await client.delete("/projects/projeto-que-nao-existe")
    assert resposta.status_code == 404


@pytest.mark.parametrize("nome", ["../etc", "..", "a/b", "a b"])
async def test_nome_invalido_nunca_apaga_fora_do_diretorio_de_projetos(
    client, projeto_descartavel, nome
):
    resposta = await client.delete(f"/projects/{nome}")
    # `..` sozinho é normalizado pelo cliente HTTP antes de chegar à rota
    # (`/projects/..` vira `/`, que não tem DELETE — 405); os demais chegam
    # como string literal e são recusados pela validação do nome (400) ou por
    # `resolve_within` (403/404). Nenhum resultado é "apagou".
    assert resposta.status_code in (400, 403, 404, 405)
    # O projeto legítimo continua no lugar — a rota não confundiu um caminho
    # malformado com "apague o que encontrar".
    _, caminho = projeto_descartavel
    assert caminho.exists()


async def test_projeto_em_execucao_nao_e_excluido(client, app_module, projeto_descartavel):
    """`running_workflows` é o mesmo dict que o resto da API usa para saber o
    que está vivo — a rota de exclusão tem de respeitá-lo como as de rerun."""
    nome, caminho = projeto_descartavel
    app_module.running_workflows[nome] = object()
    try:
        resposta = await client.delete(f"/projects/{nome}")
        assert resposta.status_code == 409
        assert caminho.exists()
    finally:
        del app_module.running_workflows[nome]
