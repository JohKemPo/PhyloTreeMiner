# syntax=docker/dockerfile:1
#
# Imagem do backend do PhyloTreeMiner: FastAPI (Backend/src/app.py) + o
# ambiente conda pinado em environment.yml (raiz do repo), que também traz as
# ferramentas de bioinformática que o submódulo BioComp_UFF invoca em tempo de
# execução (mafft, iqtree, raxml-ng, mrbayes, ...). Uma imagem só: o backend
# importa `workflow.*` diretamente do processo (ver Backend/src/app.py,
# PATH_BASE_WORKFLOW), não via subprocesso isolado.
#
# micromamba, não miniconda/anaconda completo: resolve e materializa o mesmo
# environment.yml com uma imagem base bem menor.
FROM mambaorg/micromamba:1.5.10-jammy

# Toolchain de build para as dependências pip que não publicam wheel
# manylinux para esta combinação de plataforma/Python (ex.: parmed, puxado
# transitivamente por dash-bio, compila uma extensão C++). A imagem
# micromamba:jammy não traz compilador; sem isso o `pip install` da seção
# `pip:` do environment.yml falha com "[Errno 2] No such file or directory:
# 'g++'". Só toolchain de build, nenhuma dependência de execução muda.
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
USER $MAMBA_USER

# Fonte única da receita: o mesmo environment.yml usado por
# `bash scripts/setup_env.sh` fora do container (ver CLAUDE.md "Ambiente").
# requirements.txt/requirements-dev.txt entram porque environment.yml aponta
# para eles na seção `pip:` — precisam estar ao lado do .yml para o `-r`
# relativo resolver.
COPY --chown=$MAMBA_USER:$MAMBA_USER environment.yml requirements.txt requirements-dev.txt /tmp/conda-recipe/

RUN micromamba install -y -n base -f /tmp/conda-recipe/environment.yml \
    && micromamba clean --all --yes \
    && rm -rf /tmp/conda-recipe

ARG MAMBA_DOCKERFILE_ACTIVATE=1

WORKDIR /app

# BioComp_UFF primeiro: muda com menos frequência que Backend/src durante o
# desenvolvimento, o que preserva cache de camada.
COPY --chown=$MAMBA_USER:$MAMBA_USER BioComp_UFF/ /app/BioComp_UFF/
COPY --chown=$MAMBA_USER:$MAMBA_USER Backend/ /app/Backend/

# Diretórios de saída/scratch, criados aqui (e não pelo app em runtime) para
# que um volume montado sobre eles herde o dono certo (mambauser) em vez de
# root — ver nota de operação no docker-compose.yml.
RUN mkdir -p /app/BioComp_UFF/projects /app/Backend/src/temp_ncbi

# ete3/PyQt5 (Backend/src/utils/treePlot.py, render_annotated_tree) exigem um
# display Qt; sem QT_QPA_PLATFORM=offscreen o processo aborta em qualquer
# container sem X (contrato A1 §5 "Qt headless").
ENV QT_QPA_PLATFORM=offscreen \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LD_LIBRARY_PATH=/opt/conda/lib

# LD_LIBRARY_PATH acima: sem isso, o loader resolve libstdc++.so.6 pelo
# caminho padrão do sistema (/lib/x86_64-linux-gnu, vindo do build-essential
# instalado por apt) em vez do libstdc++ mais novo do conda-forge
# (/opt/conda/lib) — e o pacote `icu` do conda (usado por ete3/pyqt) foi
# compilado contra CXXABI_1.3.15, símbolo que só o libstdc++ do conda tem.
# Sem isso, todo import de ete3 aborta com "libstdc++.so.6: version
# `CXXABI_1.3.15' not found" — confirmado rodando o container isolado.

# app.py resolve BioComp_UFF por caminho relativo a partir de
# Backend/src/app.py (BASE_DIR/../../BioComp_UFF) — o cwd precisa ser
# Backend/ para o import string "src.app:app" resolver, do mesmo jeito que
# start.sh/application_ui.sh já fazem fora do container.
WORKDIR /app/Backend

EXPOSE 8000

# Caminho absoluto: HEALTHCHECK roda via `/bin/sh -c` direto do dockerd, sem
# passar pelo ENTRYPOINT da imagem — o script que ativa o env conda (e põe
# /opt/conda/bin no PATH) nunca roda para a sonda, então um `python` sem
# caminho dá "not found" mesmo com o processo principal saudável.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD /opt/conda/bin/python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/system/health', timeout=3)" || exit 1

# Sem --reload: reservado a desenvolvimento local (contrato A1 §3).
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]
