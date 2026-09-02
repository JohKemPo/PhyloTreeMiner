"""M4.10 — `compare_trees`/`pattern-analysis`/`gen_plot`/`build_metadata_index`
saem do loop (B-5). Mesma técnica de medição do M4.9/M4.8: a task tem que
nascer na própria corrotina do teste, sem `await` intermediário antes da
requisição cronometrada — um `sleep`/fixture com `yield` deixaria uma chamada
síncrona bloqueante terminar sozinha antes da medição começar, escondendo a
regressão.
"""
import asyncio
import time

import pytest


def _bloqueia_por(segundos, retorno=None):
    def _lenta(*args, **kwargs):
        time.sleep(segundos)
        return retorno
    return _lenta


async def _mede_latencia_concorrente(client, chamada_lenta_coro):
    tarefa_lenta = asyncio.create_task(chamada_lenta_coro)
    inicio = time.monotonic()
    r_rapida = await client.head("/")
    duracao = time.monotonic() - inicio
    assert r_rapida.status_code == 200
    await tarefa_lenta
    return duracao


async def test_compare_trees_nao_bloqueia_o_loop(client, app_module, monkeypatch):
    monkeypatch.setattr(app_module, "_comparar_arvores_sync", _bloqueia_por(0.5, {"ok": True}))

    async def chamada():
        return await client.post("/api/tree/compare", json={"tree1": "x", "tree2": "y"})

    duracao = await _mede_latencia_concorrente(client, chamada())
    assert duracao < 0.4, f"GET / levou {duracao:.2f}s durante compare_trees — event loop bloqueado"


async def test_pattern_analysis_nao_bloqueia_o_loop(client, app_module, monkeypatch):
    monkeypatch.setattr(app_module, "_analisar_padroes_sync", _bloqueia_por(0.5, {"ok": True}))

    async def chamada():
        return await client.get("/api/tree/pattern-analysis/projeto-qualquer")

    duracao = await _mede_latencia_concorrente(client, chamada())
    assert duracao < 0.4, f"GET / levou {duracao:.2f}s durante pattern-analysis — event loop bloqueado"


async def test_gen_plot_metadata_cache_nao_bloqueia_o_loop(client, app_module, monkeypatch, tmp_path):
    """`get_metadata_cache` de `gen_plot` roda em thread (M4.10).

    O render ETE3/PyQt do mesmo endpoint **não** roda em thread — B4 da
    revisão de M4.10 achou `SIGSEGV` real ao mover `render_annotated_tree`
    para fora da main thread (Qt não tolera). Por isso o PNG já existe neste
    teste: só o caminho da leitura de metadata está sob teste aqui; o render
    seguir bloqueando o loop quando de fato precisa rodar é o preço aceito
    por não travar o processo inteiro.
    """
    projeto = "projeto-qualquer"
    trees_dir = tmp_path / projeto / "out" / "Trees"
    outputs_dir = tmp_path / projeto / "out" / "outputs" / "plot"
    trees_dir.mkdir(parents=True, exist_ok=True)
    outputs_dir.mkdir(parents=True, exist_ok=True)
    (trees_dir / "tree_dataset_final_mafft_iqtree.nwk").write_text("();", encoding="utf-8")
    (tmp_path / projeto / "out" / "outputs" / "metadata.json").write_text("[]", encoding="utf-8")
    (outputs_dir / "arvore_anotada_final.png").write_bytes(b"\x89PNG\r\n")

    monkeypatch.setattr(app_module, "PROJECTS_ROOT", str(tmp_path))
    monkeypatch.setattr(app_module, "get_metadata_cache", _bloqueia_por(0.5, {"node_index": {}}))

    async def chamada():
        return await client.get(f"/api/gen_plot/{projeto}")

    duracao = await _mede_latencia_concorrente(client, chamada())
    assert duracao < 0.4, f"GET / levou {duracao:.2f}s durante a leitura de metadata do gen_plot — event loop bloqueado"


async def test_build_metadata_index_nao_bloqueia_o_loop(client, app_module, monkeypatch, tmp_path):
    metadata_path = tmp_path / "metadata.json"
    metadata_path.write_text("[]", encoding="utf-8")

    monkeypatch.setattr(
        app_module, "PROJECTS_ROOT", str(tmp_path.parent)
    )
    projeto_dir = tmp_path.parent / "projeto-qualquer" / "out" / "outputs"
    projeto_dir.mkdir(parents=True, exist_ok=True)
    (projeto_dir / "metadata.json").write_text("[]", encoding="utf-8")

    monkeypatch.setattr(app_module, "get_metadata_cache", _bloqueia_por(0.5, {"insights": {}}))

    async def chamada():
        return await client.get("/api/tree/projeto-qualquer/insights")

    duracao = await _mede_latencia_concorrente(client, chamada())
    assert duracao < 0.4, f"GET / levou {duracao:.2f}s durante /insights — event loop bloqueado"


def test_render_annotated_tree_nao_e_chamado_via_to_thread():
    """B4 (revisão de M4.10) — guarda de regressão, não repete a reprodução do crash.

    `render_annotated_tree` usa ete3/PyQt e crasha (`SIGSEGV`, "QApplication
    was not created in the main() thread") se rodar fora da main thread —
    reproduzido uma vez ao investigar B4. Recriar o crash a cada `pytest`
    seria caro e instável entre ambientes; em vez disso, esta varredura AST
    garante que ninguém reembrulhe a chamada em `asyncio.to_thread`/
    `run_in_executor` sem repetir essa investigação.
    """
    import ast
    import pathlib

    caminho = pathlib.Path(__file__).resolve().parents[2] / "src" / "app.py"
    tree = ast.parse(caminho.read_text(encoding="utf-8"), filename=str(caminho))

    ofensores = []
    for node in ast.walk(tree):
        alvo_thread = (
            isinstance(node, ast.Call)
            and (
                getattr(node.func, "attr", "") in {"to_thread", "run_in_executor"}
                or getattr(node.func, "id", "") == "to_thread"
            )
        )
        if not alvo_thread:
            continue
        for arg in node.args:
            if isinstance(arg, ast.Name) and arg.id == "render_annotated_tree":
                ofensores.append(node.lineno)

    assert ofensores == [], (
        f"render_annotated_tree passado a to_thread/run_in_executor em app.py:{ofensores} "
        "— Qt crasha fora da main thread (B4, ver docstring deste teste)"
    )
