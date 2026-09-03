"""M4.12 — `render_annotated_tree` recebia `dict` e iterava como lista.

Caracterização: `metadata_dict` é documentado como indexado por accessionId
(chave -> dict de `get_node_information`), mas o código fazia
`for item in metadata_dict` — iterar um dict devolve as chaves (strings), e
`item["accessionId"]` levantava `TypeError` porque `item` é uma string.
"""
import pathlib
import threading

import pytest

from src.utils.treePlot import render_annotated_tree

NEWICK_3_FOLHAS = "(NC_001477:0.1,NC_001478:0.1,NC_001479:0.1);"


def _metadata_dict():
    return {
        "NC_001477": {"accessionId": "NC_001477", "region": "South America", "year": "2016", "country": "Brazil"},
        "NC_001478": {"accessionId": "NC_001478", "region": "South-Eastern Asia", "year": "2017", "country": "Singapore"},
        "NC_001479": {"accessionId": "NC_001479", "region": "Unknown", "year": "Unknown", "country": "Unknown"},
    }


def test_gera_png_sem_typeerror_com_dict_de_tres_acessos(tmp_path):
    tree_file = tmp_path / "tree.nwk"
    tree_file.write_text(NEWICK_3_FOLHAS, encoding="utf-8")
    output_file = tmp_path / "arvore.png"

    render_annotated_tree(str(tree_file), _metadata_dict(), output_file=str(output_file))

    assert output_file.exists()
    assert output_file.stat().st_size > 0


def test_acesso_ausente_do_indice_nao_levanta_typeerror(tmp_path):
    """Folha cujo accessionId não está no dict: tratado de forma graciosa."""
    tree_file = tmp_path / "tree.nwk"
    tree_file.write_text(NEWICK_3_FOLHAS, encoding="utf-8")
    output_file = tmp_path / "arvore.png"

    metadata = _metadata_dict()
    del metadata["NC_001479"]  # uma das 3 folhas fica sem entrada no índice

    render_annotated_tree(str(tree_file), metadata, output_file=str(output_file))

    assert output_file.exists()


def test_fora_da_main_thread_levanta_assertion_em_vez_de_crashar(tmp_path):
    """R3 (DEC-067) — guarda em tempo de execução contra o SIGSEGV de B4.

    A guarda AST anterior (`test_cpu_bound_to_thread.py`) só pega
    `to_thread(render_annotated_tree, ...)` direto; o bug real de M4.10 era
    indireto, via wrapper. A asserção no topo da função dispara antes de
    qualquer objeto Qt ser criado, então este teste roda de verdade numa
    worker thread sem reproduzir o `SIGSEGV` — é a exceção Python que
    deveria ter existido desde sempre no lugar do crash.
    """
    tree_file = tmp_path / "tree.nwk"
    tree_file.write_text(NEWICK_3_FOLHAS, encoding="utf-8")
    output_file = tmp_path / "arvore.png"

    resultado = {}

    def alvo():
        try:
            render_annotated_tree(str(tree_file), _metadata_dict(), output_file=str(output_file))
        except AssertionError as exc:
            resultado["assertion"] = exc
        except BaseException as exc:  # pragma: no cover - só para diagnóstico se algo mudar
            resultado["outro"] = exc

    t = threading.Thread(target=alvo)
    t.start()
    t.join(timeout=10)

    assert not t.is_alive(), "thread não terminou — algo travou antes da asserção"
    assert "assertion" in resultado, f"esperava AssertionError, veio {resultado.get('outro')!r}"
    assert "main thread" in str(resultado["assertion"])
    assert not output_file.exists()
