"""
Estado e duração de uma execução — lidos do manifesto, não raspados do log.

Correção de [D22](../../../docs/science/02-defeitos-que-alteram-resultado.md#d22).
O que havia antes deduzia tudo por busca de substring no `.log`, e errava em
silêncio de quatro formas medidas sobre os 21 projetos em disco:

- `idle` era o ramo `else` do parse, e a interface o mostrava como *"Waiting"*:
  um projeto que rodou 8 h 43 min e morreu no meio ficava indistinguível de um
  que nunca foi executado;
- a duração ia do primeiro ao último carimbo de tempo do arquivo. Como o log se
  chama `log_setup_{ano}_{mês}_{dia}.log` e é aberto em *append*, **duas
  execuções do mesmo dia caem no mesmo arquivo** e a conta cobria as duas mais
  o intervalo ocioso entre elas — 1 960 s reportados onde a última execução
  levou 396 s;
- a duração virava `None` sem motivo quando a última linha não tinha carimbo;
- o progresso era **0 % em 21 de 21** projetos, porque os três regex que o
  alimentavam procuravam texto que nunca chega ao arquivo lido.

A fonte autoritativa já existia e era ignorada: desde M2.5 o `manifest.json`
grava `run_id`, `started_at_utc` e `finished_at_utc`, e desde
[DEC-046](../../../docs/automation/07-log-de-execucao.md) a linha de comando de
cada ferramenta invocada. Este módulo lê o manifesto primeiro e só cai no log
quando não há manifesto — que é o caso de todos os projetos anteriores a M2.5.

**O log continua sendo lido, mas por execução.** A varredura corta o arquivo nas
fronteiras de execução antes de medir, de modo que a duração passa a ser a da
**última** execução e não a soma de todas com os intervalos no meio. Isso
resolve o erro de 5× sem depender da mudança no pipeline (um arquivo por
execução, com `run_id` no nome), que é lote de `BioComp_UFF/`.

**Nada aqui devolve um número quando o número é desconhecido.** É a regra 5 do
projeto: "não aplicável" nunca é `0` nem `-1`. Estado desconhecido é
`unknown`, duração desconhecida é `None` **com motivo**, e progresso
indeterminado é `None` — nunca `0 %`.
"""

from __future__ import annotations

import datetime
import glob
import json
import os
import re
from typing import Dict, List, Optional, Tuple

__all__ = [
    "ESTADOS",
    "ExecutionState",
    "resolver_estado",
    "MARCADOR_CONCLUSAO",
]

#: Estados possíveis. Enumeração **fechada**: quem não couber aqui é `unknown`,
#: e `unknown` não é `never_run`. Foi a fusão desses dois em `idle` que fez a
#: interface anunciar "Waiting" para execuções que tinham morrido no meio.
ESTADOS = (
    "running",       # processo vivo agora
    "completed",     # terminou e declarou conclusão
    "failed",        # terminou com erro registrado
    "interrupted",   # começou, não declarou conclusão, e não há processo vivo
    "never_run",     # nenhum vestígio de execução
    "unknown",       # há vestígio, e ele não permite decidir
)

MARCADOR_CONCLUSAO = "Completed successfully!"

#: Acima deste intervalo, linhas depois de uma conclusão são execução nova; abaixo,
#: são a cauda de encerramento da anterior. Ver `_fatiar_execucoes`.
_INTERVALO_NOVA_EXECUCAO_S = 60.0

_CARIMBO = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})")
_ETAPA = re.compile(r"STEP:\s*(.*)")
_ENTRADA = re.compile(r"Iniciando processamento do arquivo:\s*(.*)")
_NIVEL_ERRO = re.compile(r"^\S+ \S+ - ERROR - ")


class ExecutionState:
    """
    O que se sabe sobre a última execução de um projeto, e de onde se sabe.

    `fonte` não é enfeite: ela diz se o registro veio do manifesto (declarado
    pelo pipeline) ou do log (reconstruído por leitura). Um consumidor que vá
    publicar um tempo — a curva de custo de M7.7, por exemplo — precisa saber
    a diferença.

    Attributes
    ----------
    estado : str
        Um de `ESTADOS`.
    duracao_s : int or None
        Segundos da **última** execução. `None` quando indeterminada.
    duracao_motivo : str or None
        Por que a duração é `None`. Sempre preenchido quando ela é.
    fonte : str
        ``"manifesto"``, ``"log"`` ou ``"nenhuma"``.
    etapa : str or None
        Última etapa anunciada pelo pipeline, ou `None`.
    progresso : int or None
        Percentual, **só quando calculável**. `None` significa indeterminado —
        nunca `0`.
    arvores : int
        Árvores presentes em `out/Trees/`. Contagem real, não estimativa.
    run_id : str or None
    execucoes_no_log : int
        Quantas execuções o arquivo de log concatena. `> 1` é o defeito de
        `append` que ainda vive no pipeline.
    """

    __slots__ = ("estado", "duracao_s", "duracao_motivo", "fonte", "etapa",
                 "progresso", "arvores", "run_id", "execucoes_no_log",
                 "arquivo_entrada")

    def __init__(self, estado: str = "never_run", duracao_s: Optional[int] = None,
                 duracao_motivo: Optional[str] = None, fonte: str = "nenhuma",
                 etapa: Optional[str] = None, progresso: Optional[int] = None,
                 arvores: int = 0, run_id: Optional[str] = None,
                 execucoes_no_log: int = 0,
                 arquivo_entrada: Optional[str] = None) -> None:
        self.estado = estado
        self.duracao_s = duracao_s
        self.duracao_motivo = duracao_motivo
        self.fonte = fonte
        self.etapa = etapa
        self.progresso = progresso
        self.arvores = arvores
        self.run_id = run_id
        self.execucoes_no_log = execucoes_no_log
        self.arquivo_entrada = arquivo_entrada

    def to_dict(self) -> Dict:
        return {chave: getattr(self, chave) for chave in self.__slots__}


# ------------------------------------------------------------------ #
# Manifesto — a fonte declarada
# ------------------------------------------------------------------ #

def _ler_manifesto(outputs_dir: str) -> Optional[Dict]:
    caminho = os.path.join(outputs_dir, "manifest.json")
    if not os.path.exists(caminho):
        return None
    try:
        with open(caminho, encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        # Manifesto ilegível é um fato sobre a execução, não um motivo para
        # fingir que ela não existiu.
        return {}


def _instante(valor: Optional[str]) -> Optional[datetime.datetime]:
    if not valor:
        return None
    try:
        return datetime.datetime.fromisoformat(valor)
    except ValueError:
        return None


# ------------------------------------------------------------------ #
# Log — a fonte reconstruída, agora recortada por execução
# ------------------------------------------------------------------ #

def _log_mais_recente(outputs_dir: str) -> Optional[str]:
    logs = glob.glob(os.path.join(outputs_dir, "*.log"))
    return max(logs, key=os.path.getmtime) if logs else None


def _fatiar_execucoes(linhas: List[str]) -> List[List[str]]:
    """
    Recorta o log nas fronteiras de execução.

    O pipeline abre o log em modo *append* e o nomeia por dia, então duas
    execuções no mesmo dia compartilham arquivo. Medir do primeiro ao último
    carimbo cobre as duas **e o intervalo ocioso entre elas**: é a origem do
    erro de 5× medido em `Teste_Neo4j` (1 960 s reportados, 396 s reais).

    A fronteira é o marcador de conclusão. O que sobra depois do último
    marcador **não é automaticamente uma execução nova**: toda execução escreve
    algumas linhas de encerramento depois de anunciar a conclusão — a gravação
    do manifesto, por exemplo. Tratar essa cauda como execução separada faria
    todo projeto concluído aparecer como interrompido.

    O que separa cauda de execução nova é o **intervalo**: linhas de
    encerramento saem em milissegundos, uma execução nova começa depois de um
    intervalo humano. `_INTERVALO_NOVA_EXECUCAO_S` é o corte.

    É heurística, e existe só porque o pipeline compartilha arquivo entre
    execuções do mesmo dia. O conserto definitivo é um arquivo por execução com
    `run_id` no nome, que é lote de `BioComp_UFF/`.
    """
    fatias: List[List[str]] = []
    atual: List[str] = []
    for linha in linhas:
        atual.append(linha)
        if MARCADOR_CONCLUSAO in linha:
            fatias.append(atual)
            atual = []

    if not atual:
        return fatias
    if not fatias:
        return [atual]

    if _intervalo_s(fatias[-1], atual) >= _INTERVALO_NOVA_EXECUCAO_S:
        fatias.append(atual)          # execução nova, que não chegou a concluir
    else:
        fatias[-1].extend(atual)      # cauda de encerramento da anterior
    return fatias


def _intervalo_s(anterior: List[str], seguinte: List[str]) -> float:
    """Segundos entre o fim de uma fatia e o início da próxima; `inf` se indecidível."""
    fim = next((m for m in (_CARIMBO.match(l) for l in reversed(anterior)) if m), None)
    inicio = next((m for m in (_CARIMBO.match(l) for l in seguinte) if m), None)
    if not fim or not inicio:
        return float("inf")
    try:
        a = datetime.datetime.strptime(fim.group(1), "%Y-%m-%d %H:%M:%S,%f")
        b = datetime.datetime.strptime(inicio.group(1), "%Y-%m-%d %H:%M:%S,%f")
    except ValueError:
        return float("inf")
    return (b - a).total_seconds()


def _duracao_da_fatia(fatia: List[str]) -> Tuple[Optional[int], Optional[str]]:
    """
    Segundos entre o primeiro e o último carimbo **existentes** na fatia.

    Antes, a conta usava a última *linha*: bastava o log terminar num
    *traceback* — que não tem carimbo — para a duração virar `None` sem que
    nada dissesse por quê. Procurar o último carimbo de verdade resolve o caso
    comum; quando não há nenhum, a razão é devolvida junto.
    """
    carimbos = [_CARIMBO.match(l) for l in fatia]
    presentes = [m for m in carimbos if m]
    if not presentes:
        return None, "nenhuma linha do log tem carimbo de tempo"
    if len(presentes) == 1:
        return None, "o log tem um único carimbo de tempo: não há intervalo a medir"
    try:
        inicio = datetime.datetime.strptime(presentes[0].group(1), "%Y-%m-%d %H:%M:%S,%f")
        fim = datetime.datetime.strptime(presentes[-1].group(1), "%Y-%m-%d %H:%M:%S,%f")
    except ValueError:
        return None, "carimbo de tempo em formato inesperado"
    return max(int((fim - inicio).total_seconds()), 0), None


def _ultima(padrao: re.Pattern, linhas: List[str]) -> Optional[str]:
    for linha in reversed(linhas):
        achado = padrao.search(linha)
        if achado:
            return achado.group(1).strip()
    return None


# ------------------------------------------------------------------ #
# Resolução
# ------------------------------------------------------------------ #

def _contar_arvores(project_path: str) -> int:
    trees = os.path.join(project_path, "out", "Trees")
    if not os.path.isdir(trees):
        return 0
    return len([f for f in os.listdir(trees) if f.endswith((".nexus", ".nwk"))])


def resolver_estado(project_path: str, em_execucao: bool = False) -> ExecutionState:
    """
    Estado, duração e etapa da última execução de um projeto.

    Parameters
    ----------
    project_path : str
        Diretório do projeto (o que contém `out/`).
    em_execucao : bool
        Se há processo vivo para este projeto **agora**. É o único fato que
        nem o manifesto nem o log conseguem informar, e é o que separa
        "em execução" de "interrompida".

    Return
    ------
    ExecutionState
    """
    outputs = os.path.join(project_path, "out", "outputs")
    arvores = _contar_arvores(project_path)

    if not os.path.isdir(outputs):
        return ExecutionState(estado="running" if em_execucao else "never_run",
                              fonte="nenhuma", arvores=arvores,
                              duracao_motivo=None if em_execucao else
                              "o projeto não tem diretório de saída")

    manifesto = _ler_manifesto(outputs)
    log = _log_mais_recente(outputs)

    # ---------------- manifesto ---------------- #
    if manifesto:
        inicio = _instante(manifesto.get("started_at_utc"))
        fim = _instante(manifesto.get("finished_at_utc"))
        run_id = manifesto.get("run_id")

        if inicio and fim:
            duracao, motivo = max(int((fim - inicio).total_seconds()), 0), None
        elif inicio and em_execucao:
            agora = datetime.datetime.now(inicio.tzinfo or datetime.timezone.utc)
            duracao, motivo = max(int((agora - inicio).total_seconds()), 0), None
        elif inicio:
            duracao, motivo = None, ("a execução não registrou conclusão e não há "
                                     "processo vivo: duração indeterminada")
        else:
            duracao, motivo = None, "o manifesto não registra o início da execução"

        if em_execucao:
            estado = "running"
        elif fim:
            # O manifesto é gravado no `finally`, então ele conclui mesmo quando
            # o pipeline falhou. Quem decide entre concluído e falho continua
            # sendo o log, que é onde o erro aparece.
            estado = _estado_pelo_log(log) if log else "unknown"
        else:
            estado = "interrupted"

        return ExecutionState(
            estado=estado, duracao_s=duracao, duracao_motivo=motivo,
            fonte="manifesto", run_id=run_id, arvores=arvores,
            progresso=100 if estado == "completed" else None,
            etapa=_ultima(_ETAPA, _linhas(log)) if log else None,
            execucoes_no_log=_contar_execucoes(log),
            arquivo_entrada=_entrada_do_manifesto(manifesto),
        )

    # ---------------- log ---------------- #
    if not log:
        return ExecutionState(estado="running" if em_execucao else "never_run",
                              fonte="nenhuma", arvores=arvores,
                              duracao_motivo=None if em_execucao else
                              "o projeto não tem arquivo de log")

    linhas = _linhas(log)
    if not linhas:
        return ExecutionState(estado="unknown", fonte="log", arvores=arvores,
                              duracao_motivo="o arquivo de log está vazio")

    fatias = _fatiar_execucoes(linhas)
    ultima = fatias[-1]
    duracao, motivo = _duracao_da_fatia(ultima)
    estado = "running" if em_execucao else _estado_das_linhas(ultima)

    return ExecutionState(
        estado=estado, duracao_s=duracao, duracao_motivo=motivo, fonte="log",
        etapa=_ultima(_ETAPA, ultima), arvores=arvores,
        progresso=100 if estado == "completed" else None,
        execucoes_no_log=len([f for f in fatias if any(MARCADOR_CONCLUSAO in l for l in f)])
                          or (1 if linhas else 0),
        arquivo_entrada=_ultima(_ENTRADA, ultima),
    )


def _linhas(log: Optional[str]) -> List[str]:
    if not log:
        return []
    try:
        with open(log, encoding="utf-8", errors="ignore") as handle:
            return [l for l in handle.read().splitlines() if l.strip()]
    except OSError:
        return []


def _contar_execucoes(log: Optional[str]) -> int:
    linhas = _linhas(log)
    if not linhas:
        return 0
    return sum(1 for l in linhas if MARCADOR_CONCLUSAO in l) or 1


def _estado_das_linhas(linhas: List[str]) -> str:
    """
    Decide entre concluído, falho e interrompido para **uma** execução.

    O erro é reconhecido pelo nível do registro (`- ERROR -`), não pela
    presença da palavra em qualquer lugar do arquivo: a busca antiga por
    `"ERROR" in log_content` casava com uma execução anterior anexada ao mesmo
    arquivo, e com erro do qual o pipeline se recuperou.
    """
    if any(MARCADOR_CONCLUSAO in l for l in linhas):
        return "completed"
    if any(_NIVEL_ERRO.match(l) for l in linhas):
        return "failed"
    return "interrupted"


def _estado_pelo_log(log: Optional[str]) -> str:
    linhas = _linhas(log)
    if not linhas:
        return "unknown"
    return _estado_das_linhas(_fatiar_execucoes(linhas)[-1])


def _entrada_do_manifesto(manifesto: Dict) -> Optional[str]:
    try:
        return manifesto["params"]["tree_config"]["input_path"]
    except (KeyError, TypeError):
        return None
