"""
D22 — estado e duração da execução. Cada teste é um dos modos de falha medidos.

Os três endpoints que a interface usa para dizer o que está acontecendo
(`/projects`, `/projects/status`, `/projects/details`) não tinham **um único
teste**. Foi o que permitiu que `idle` fosse o ramo `else` do parse, que a
duração somasse execuções distintas e que o progresso fosse 0 % em 21 de 21
projetos sem que nada acusasse.

Cada caso abaixo é um cenário medido em disco, reduzido a um log sintético.
"""
import os

import pytest

from src.services.execution_state import ESTADOS, resolver_estado


CONCLUSAO = "STEP: Completed successfully!"


def _projeto(tmp_path, linhas=None, manifesto=None, arvores=0):
    """Monta um projeto no formato que o backend espera encontrar."""
    raiz = tmp_path / "projeto"
    outputs = raiz / "out" / "outputs"
    outputs.mkdir(parents=True)
    (raiz / "out" / "Trees").mkdir()
    for i in range(arvores):
        (raiz / "out" / "Trees" / f"arvore_{i}.nexus").write_text("#NEXUS\n")
    if linhas is not None:
        (outputs / "log_setup_2026_8_26.log").write_text("\n".join(linhas) + "\n")
    if manifesto is not None:
        import json
        (outputs / "manifest.json").write_text(json.dumps(manifesto))
    return str(raiz)


def _linha(hhmmss, nivel, mensagem):
    return f"2026-08-26 {hhmmss},000 - {nivel} - {mensagem}"


# --------------------------------------------------------------------------- #
# O defeito central: `idle` era o balde de tudo que o parse não decidia
# --------------------------------------------------------------------------- #

def test_execucao_interrompida_nao_e_nunca_executada(tmp_path):
    """O caso de `Zika_..._480seq_ADVANCED`: rodou 8 h 43 min, morreu no meio, e
    a interface o mostrava como "Waiting" — igual a um projeto virgem."""
    caminho = _projeto(tmp_path, [
        _linha("10:00:00", "INFO", "STEP: Aligning seqs..."),
        _linha("18:43:00", "INFO", "STEP: Construction of Subtrees."),
    ], arvores=9)
    estado = resolver_estado(caminho)
    assert estado.estado == "interrupted"
    assert estado.estado != "never_run"


def test_projeto_sem_vestigio_e_never_run(tmp_path):
    caminho = _projeto(tmp_path)
    assert resolver_estado(caminho).estado == "never_run"


def test_log_vazio_e_unknown_nao_never_run(tmp_path):
    """Há vestígio e ele não decide: isso é `unknown`, que não é o mesmo que
    ausência de vestígio."""
    caminho = _projeto(tmp_path, [])
    assert resolver_estado(caminho).estado == "unknown"


def test_todo_estado_pertence_a_enumeracao(tmp_path):
    caminho = _projeto(tmp_path, [_linha("10:00:00", "INFO", "algo")])
    assert resolver_estado(caminho).estado in ESTADOS


# --------------------------------------------------------------------------- #
# Duração: o erro de 5x
# --------------------------------------------------------------------------- #

def test_duas_execucoes_no_mesmo_log_medem_so_a_ultima(tmp_path):
    """O caso de `Teste_Neo4j`: 1 960 s reportados onde a última execução levou
    396 s. O log é aberto em `append` e nomeado por dia, então duas execuções do
    mesmo dia caem no mesmo arquivo; medir do primeiro ao último carimbo cobria
    as duas mais o intervalo ocioso entre elas."""
    caminho = _projeto(tmp_path, [
        _linha("11:14:00", "INFO", "STEP: Aligning seqs..."),
        _linha("11:30:00", "INFO", CONCLUSAO),          # execução 1: 960 s
        _linha("11:40:00", "INFO", "STEP: Aligning seqs..."),
        _linha("11:46:36", "INFO", CONCLUSAO),          # execução 2: 396 s
    ])
    estado = resolver_estado(caminho)
    assert estado.duracao_s == 396
    assert estado.execucoes_no_log == 2


def test_cauda_depois_da_conclusao_nao_e_execucao_nova(tmp_path):
    """Toda execução escreve linhas de encerramento depois de anunciar a
    conclusão — a gravação do manifesto, por exemplo. Tratar essa cauda como
    execução separada faria todo projeto concluído aparecer como interrompido."""
    caminho = _projeto(tmp_path, [
        _linha("15:28:24", "INFO", "STEP: Aligning seqs..."),
        _linha("15:38:43", "INFO", CONCLUSAO),
        _linha("15:38:43", "INFO", "Manifesto de execução gravado em out/outputs/manifest.json"),
    ])
    estado = resolver_estado(caminho)
    assert estado.estado == "completed"
    assert estado.duracao_s == 619
    assert estado.execucoes_no_log == 1


def test_duracao_indeterminada_traz_motivo(tmp_path):
    """`duration` virava `None` sem explicação quando a última linha não tinha
    carimbo. Ausência silenciosa é o que a regra 5 do projeto proíbe."""
    caminho = _projeto(tmp_path, ["Traceback (most recent call last):",
                                  "  File \"x.py\", line 1"])
    estado = resolver_estado(caminho)
    assert estado.duracao_s is None
    assert estado.duracao_motivo


def test_log_que_termina_sem_carimbo_ainda_mede(tmp_path):
    """O caso de `test_variola_noITRs`: o log termina num traceback e a duração
    ficava `None`. Procurar o último carimbo *existente* resolve."""
    caminho = _projeto(tmp_path, [
        _linha("02:00:00", "INFO", "STEP: Aligning seqs..."),
        _linha("02:05:00", "ERROR", "Erro no alinhamento das sequências"),
        "Traceback (most recent call last):",
    ])
    estado = resolver_estado(caminho)
    assert estado.duracao_s == 300
    assert estado.estado == "failed"


# --------------------------------------------------------------------------- #
# Estado: substring não decide
# --------------------------------------------------------------------------- #

def test_erro_de_execucao_anterior_nao_reprova_a_atual(tmp_path):
    """A busca antiga era `"ERROR" in log_content` sobre o arquivo inteiro: um
    erro da execução anterior, anexado ao mesmo arquivo, marcava a atual como
    falha."""
    caminho = _projeto(tmp_path, [
        _linha("10:00:00", "ERROR", "Erro no alinhamento"),
        _linha("10:01:00", "INFO", CONCLUSAO),
        _linha("11:00:00", "INFO", "STEP: Aligning seqs..."),
        _linha("11:10:00", "INFO", CONCLUSAO),
    ])
    assert resolver_estado(caminho).estado == "completed"


def test_palavra_error_no_meio_da_mensagem_nao_e_falha(tmp_path):
    """O erro é reconhecido pelo nível do registro, não pela palavra em
    qualquer lugar — um nome de arquivo pode conter `ERROR`."""
    caminho = _projeto(tmp_path, [
        _linha("10:00:00", "INFO", "lendo dataset_ERROR_recuperado.fasta"),
        _linha("10:05:00", "INFO", CONCLUSAO),
    ])
    assert resolver_estado(caminho).estado == "completed"


def test_processo_vivo_vence_o_arquivo(tmp_path):
    """É o único fato que nem o log nem o manifesto conseguem informar."""
    caminho = _projeto(tmp_path, [_linha("10:00:00", "INFO", "STEP: Aligning seqs...")])
    assert resolver_estado(caminho, em_execucao=True).estado == "running"


# --------------------------------------------------------------------------- #
# Manifesto: a fonte declarada tem precedência
# --------------------------------------------------------------------------- #

def test_manifesto_tem_precedencia_sobre_o_log(tmp_path):
    caminho = _projeto(tmp_path,
        linhas=[_linha("10:00:00", "INFO", "STEP: Aligning seqs..."),
                _linha("10:10:00", "INFO", CONCLUSAO)],
        manifesto={"run_id": "abc123", "manifest_version": 2,
                   "started_at_utc": "2026-08-26T18:28:24+00:00",
                   "finished_at_utc": "2026-08-26T18:38:43+00:00"})
    estado = resolver_estado(caminho)
    assert estado.fonte == "manifesto"
    assert estado.duracao_s == 619          # do manifesto, não os 600 s do log
    assert estado.run_id == "abc123"
    assert estado.estado == "completed"


def test_manifesto_sem_conclusao_e_sem_processo_e_interrompida(tmp_path):
    """O manifesto é gravado no início da execução; sem `finished_at_utc` e sem
    processo vivo, ela morreu antes do `finally`."""
    caminho = _projeto(tmp_path,
        linhas=[_linha("10:00:00", "INFO", "STEP: Aligning seqs...")],
        manifesto={"run_id": "abc", "started_at_utc": "2026-08-26T18:00:00+00:00",
                   "finished_at_utc": None})
    estado = resolver_estado(caminho)
    assert estado.estado == "interrupted"
    assert estado.duracao_s is None
    assert estado.duracao_motivo


def test_manifesto_ilegivel_nao_apaga_a_execucao(tmp_path):
    caminho = _projeto(tmp_path,
        linhas=[_linha("10:00:00", "INFO", "STEP: Aligning seqs..."),
                _linha("10:10:00", "INFO", CONCLUSAO)])
    with open(os.path.join(caminho, "out", "outputs", "manifest.json"), "w") as h:
        h.write("{ isto não é json")
    estado = resolver_estado(caminho)
    assert estado.estado in ESTADOS
    assert estado.estado != "never_run"


# --------------------------------------------------------------------------- #
# Progresso: `null` é indeterminado, nunca 0
# --------------------------------------------------------------------------- #

def test_progresso_indeterminado_e_none_nunca_zero(tmp_path):
    """Era 0 % em 21 de 21 projetos, o que é indistinguível de "não começou"."""
    caminho = _projeto(tmp_path, [
        _linha("10:00:00", "INFO", "STEP: Construction of Subtrees."),
    ], arvores=9)
    estado = resolver_estado(caminho)
    assert estado.progresso is None
    assert estado.arvores == 9          # a contagem real substitui a barra falsa


def test_concluida_tem_progresso_cem(tmp_path):
    caminho = _projeto(tmp_path, [
        _linha("10:00:00", "INFO", "STEP: Aligning seqs..."),
        _linha("10:10:00", "INFO", CONCLUSAO),
    ])
    assert resolver_estado(caminho).progresso == 100
