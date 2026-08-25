#!/usr/bin/env bash
# ==============================================================================
# Cria ou atualiza o ambiente conda do PhyloTreeMiner.
#
# Existe para que o projeto **não instale nada no ambiente geral da máquina**.
# Sem isto, um `conda install` roda no env ativo — que costuma ser o `base` —
# e mistura as ferramentas do projeto com as de todo o resto.
#
#   bash scripts/setup_env.sh              # cria ou atualiza
#   bash scripts/setup_env.sh --recreate   # apaga e refaz do zero
#   PTM_ENV=outro bash scripts/setup_env.sh
#
# Depois, em cada sessão:  conda activate phylotreeminer
# ==============================================================================

set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; DIM='\033[2m'; NC='\033[0m'

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RECEITA="$RAIZ/environment.yml"
source "$RAIZ/scripts/lib_env.sh"
ENV_NOME="$(ptm_env_nome)"
RECRIAR=0

for arg in "$@"; do
  [ "$arg" = "--recreate" ] && RECRIAR=1
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  AMBIENTE CONDA DO PHYLOTREEMINER${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"

# ------------------------------------------------------------------ #
# Gestor
# ------------------------------------------------------------------ #
GESTOR=""
command -v mamba >/dev/null 2>&1 && GESTOR="mamba"
[ -z "$GESTOR" ] && command -v conda >/dev/null 2>&1 && GESTOR="conda"

if [ -z "$GESTOR" ]; then
  echo -e "${RED}✗ Nem conda nem mamba no PATH.${NC}"
  echo -e "  Instale o Miniforge: ${DIM}https://github.com/conda-forge/miniforge${NC}"
  exit 1
fi
echo -e "  gestor: ${GESTOR}$([ "$GESTOR" = "mamba" ] && echo " ${DIM}(mais rápido que o conda)${NC}")"

[ -f "$RECEITA" ] || { echo -e "${RED}✗ $RECEITA não encontrado.${NC}"; exit 1; }

# ------------------------------------------------------------------ #
# Nunca no base
# ------------------------------------------------------------------ #
if [ "$ENV_NOME" = "base" ]; then
  echo -e "${RED}✗ Recusando criar o projeto dentro do 'base'.${NC}"
  echo -e "  O objetivo deste script é justamente separar os dois."
  exit 1
fi

EXISTE=0
ptm_env_existe "$ENV_NOME" && EXISTE=1

# ------------------------------------------------------------------ #
# Criar, atualizar ou recriar
# ------------------------------------------------------------------ #
if [ "$EXISTE" -eq 1 ] && [ "$RECRIAR" -eq 1 ]; then
  echo -e "\n${YELLOW}Removendo o env '$ENV_NOME' para refazer do zero...${NC}"
  conda env remove -n "$ENV_NOME" -y || { echo -e "${RED}✗ Falha ao remover.${NC}"; exit 1; }
  EXISTE=0
fi

if [ "$EXISTE" -eq 1 ]; then
  echo -e "\n${YELLOW}Atualizando o env '$ENV_NOME' a partir de environment.yml...${NC}"
  ACAO=(env update -n "$ENV_NOME" -f "$RECEITA" --prune)
else
  echo -e "\n${YELLOW}Criando o env '$ENV_NOME'...${NC}"
  ACAO=(env create -n "$ENV_NOME" -f "$RECEITA")
  echo -e "${DIM}  (o -n manda: o campo 'name:' da receita é ignorado)${NC}"
fi

if ! "$GESTOR" "${ACAO[@]}"; then
  echo -e "\n${RED}✗ A resolução do ambiente falhou.${NC}"
  echo -e "${DIM}  Causas frequentes, em ordem:${NC}"
  echo -e "${DIM}   1. Arquitetura sem build no bioconda (ARM / Apple Silicon).${NC}"
  echo -e "${DIM}      Teste:  conda config --show subdir${NC}"
  echo -e "${DIM}      Saída:  CONDA_SUBDIR=osx-64 bash scripts/setup_env.sh --recreate${NC}"
  echo -e "${DIM}   2. Canal 'defaults' com prioridade estrita conflitando com bioconda.${NC}"
  echo -e "${DIM}      Saída:  conda config --set channel_priority flexible${NC}"
  echo -e "${DIM}   3. Solver clássico onde o libmamba resolveria.${NC}"
  echo -e "${DIM}      Saída:  conda config --set solver libmamba${NC}"
  exit 1
fi

# ------------------------------------------------------------------ #
# Conferir os binários DENTRO do env, não no PATH
# ------------------------------------------------------------------ #
BIN="$(ptm_env_bin "$ENV_NOME")"

echo -e "\n${YELLOW}Conferindo as ferramentas dentro do env...${NC}"
if [ -n "$BIN" ]; then
  PTM_BIN="$BIN" bash "$RAIZ/scripts/check_dependencies.sh" || true
else
  echo -e "${YELLOW}  Não foi possível localizar o bin do env; pulando a conferência.${NC}"
fi

echo -e "\n${GREEN}✓ Ambiente '$ENV_NOME' pronto.${NC}"
echo -e "  Ative com: ${BLUE}conda activate $ENV_NOME${NC}"
echo -e "${DIM}  As ferramentas do projeto ficam só aqui — o ambiente geral da máquina${NC}"
echo -e "${DIM}  não é tocado. Se algo já foi instalado no 'base' por engano, rode:${NC}"
echo -e "${DIM}  bash scripts/cleanup_env.sh${NC}"
