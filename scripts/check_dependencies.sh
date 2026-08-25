#!/usr/bin/env bash
# ==============================================================================
# Verificação de dependências do PhyloTreeMiner
#
# Confere as ferramentas externas que o pipeline invoca e diz, para cada uma, se
# está presente e em que versão. Instalar é OPT-IN: sem `--install`, o script
# apenas relata e imprime o comando que instalaria — instalar software na
# máquina de alguém sem pedir é decisão de quem está na frente do teclado.
#
#   bash scripts/check_dependencies.sh              # só relata
#   bash scripts/check_dependencies.sh --install    # instala o que falta
#   bash scripts/check_dependencies.sh --quiet      # só o resumo (para o start.sh)
#
# Código de saída: 0 se nada essencial falta; 1 caso contrário.
# ==============================================================================

set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; DIM='\033[2m'; NC='\033[0m'

INSTALAR=0
QUIETO=0
for arg in "$@"; do
  case "$arg" in
    --install) INSTALAR=1 ;;
    --quiet)   QUIETO=1 ;;
  esac
done

FALTANDO_ESSENCIAL=()
FALTANDO_OPCIONAL=()
PACOTES_CONDA=()

# nome | binário | essencial(1/0) | args de versão | pacote conda (canal::pacote)
FERRAMENTAS=(
  "MAFFT|mafft|1|--version|bioconda::mafft"
  "Clustal Omega|clustalo|1|--version|bioconda::clustalo"
  "MUSCLE|muscle|1|-version|bioconda::muscle"
  "FastTree|FastTree|1||bioconda::fasttree"
  "IQ-TREE|iqtree2|1|--version|bioconda::iqtree"
  "RAxML-NG|raxml-ng|1|--version|bioconda::raxml-ng"
  "MrBayes|mb|0||bioconda::mrbayes"
)

versao_de() {
  local bin="$1" args="$2"
  local saida
  if [ -n "$args" ]; then
    saida=$("$bin" $args </dev/null 2>&1 | head -5)
  else
    # FastTree e MrBayes imprimem a versão no banner e LEEM a entrada padrão:
    # sem `</dev/null` ficam bloqueados esperando dados.
    saida=$("$bin" </dev/null 2>&1 | head -5)
  fi
  echo "$saida" | grep -oiE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1
}

[ "$QUIETO" -eq 0 ] && {
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  DEPENDÊNCIAS DE BIOINFORMÁTICA${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
}

for entrada in "${FERRAMENTAS[@]}"; do
  IFS='|' read -r nome bin essencial args pacote <<< "$entrada"

  if command -v "$bin" >/dev/null 2>&1; then
    v=$(versao_de "$bin" "$args")
    [ "$QUIETO" -eq 0 ] && printf "  ${GREEN}✓${NC} %-16s %s\n" "$nome" "${v:-versão não detectada}"
  else
    if [ "$essencial" -eq 1 ]; then
      FALTANDO_ESSENCIAL+=("$nome")
      [ "$QUIETO" -eq 0 ] && printf "  ${RED}✗${NC} %-16s ${DIM}ausente — %s${NC}\n" "$nome" "$pacote"
    else
      FALTANDO_OPCIONAL+=("$nome")
      [ "$QUIETO" -eq 0 ] && printf "  ${YELLOW}○${NC} %-16s ${DIM}ausente (opcional) — %s${NC}\n" "$nome" "$pacote"
    fi
    PACOTES_CONDA+=("$pacote")
  fi
done

# ------------------------------------------------------------------ #
# Instalação, quando pedida
# ------------------------------------------------------------------ #
if [ ${#PACOTES_CONDA[@]} -gt 0 ]; then
  GESTOR=""
  command -v mamba >/dev/null 2>&1 && GESTOR="mamba"
  [ -z "$GESTOR" ] && command -v conda >/dev/null 2>&1 && GESTOR="conda"

  if [ -z "$GESTOR" ]; then
    [ "$QUIETO" -eq 0 ] && echo -e "\n${YELLOW}Nem conda nem mamba no PATH — instale as ferramentas pelo gerenciador da sua distribuição.${NC}"
  else
    COMANDO="$GESTOR install -y -c conda-forge -c bioconda ${PACOTES_CONDA[*]//bioconda::/}"
    if [ "$INSTALAR" -eq 1 ]; then
      echo -e "\n${YELLOW}Instalando o que falta:${NC}\n  ${COMANDO}\n"
      $COMANDO || {
        echo -e "${RED}✗ A instalação falhou. Rode o comando à mão para ver o erro completo.${NC}"
        exit 1
      }
      echo -e "${GREEN}✓ Instalação concluída. Rode este script de novo para conferir.${NC}"
    elif [ "$QUIETO" -eq 0 ]; then
      echo -e "\n${YELLOW}Para instalar o que falta:${NC}"
      echo -e "  ${COMANDO}"
      echo -e "  ${DIM}ou: bash scripts/check_dependencies.sh --install${NC}"
    fi
  fi
fi

# ------------------------------------------------------------------ #
# Resumo
# ------------------------------------------------------------------ #
if [ ${#FALTANDO_ESSENCIAL[@]} -gt 0 ]; then
  echo -e "${RED}✗ Faltam ${#FALTANDO_ESSENCIAL[@]} ferramenta(s) essencial(is): ${FALTANDO_ESSENCIAL[*]}${NC}"
  echo -e "${DIM}  O pipeline vai falhar ao escolher um método que dependa delas.${NC}"
  exit 1
fi

if [ ${#FALTANDO_OPCIONAL[@]} -gt 0 ]; then
  echo -e "${YELLOW}○ Opcional(is) ausente(s): ${FALTANDO_OPCIONAL[*]} — o método correspondente ficará indisponível.${NC}"
fi

[ "$QUIETO" -eq 0 ] && echo -e "${GREEN}✓ Todas as ferramentas essenciais estão presentes.${NC}"
exit 0
