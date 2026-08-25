#!/usr/bin/env bash
# ==============================================================================
# Desfaz instalações do PhyloTreeMiner que foram parar no ambiente errado.
#
# POR QUE ISTO EXISTE
#
# Até 2026-08-25, `scripts/check_dependencies.sh --install` rodava
# `conda install` **sem `-n`**, ou seja, no ambiente ATIVO. Quem executasse com
# o `base` ativo — o caso comum — instalava mafft, clustalo, muscle, fasttree,
# iqtree, raxml-ng e mrbayes no ambiente geral da máquina, e não no do projeto.
#
# Este script diagnostica e, se você mandar, remove. Ele **não apaga nada por
# conta própria**: sem `--apply`, apenas relata.
#
#   bash scripts/cleanup_env.sh              # diagnóstico, não muda nada
#   bash scripts/cleanup_env.sh --apply      # remove do base, confirmando antes
#   PTM_ENV=outro bash scripts/cleanup_env.sh
#
# Não toca no ambiente do projeto nem em envs que você criou.
# ==============================================================================

set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; DIM='\033[2m'; NC='\033[0m'

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib_env.sh"
ENV_PROJETO="$(ptm_env_nome)"
APLICAR=0
for arg in "$@"; do [ "$arg" = "--apply" ] && APLICAR=1; done

FERRAMENTAS=(mafft clustalo muscle fasttree iqtree raxml-ng mrbayes)

command -v conda >/dev/null 2>&1 || { echo -e "${RED}✗ conda não está no PATH.${NC}"; exit 1; }

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  LIMPEZA DE AMBIENTE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"

# ------------------------------------------------------------------ #
# O que está onde
# ------------------------------------------------------------------ #
NO_BASE=()
echo -e "\n${YELLOW}Ferramentas de bioinformática no env 'base':${NC}"
LISTA_BASE="$(conda list -n base 2>/dev/null)"
for f in "${FERRAMENTAS[@]}"; do
  linha="$(echo "$LISTA_BASE" | grep -E "^${f}[[:space:]]" | head -1)"
  if [ -n "$linha" ]; then
    NO_BASE+=("$f")
    printf "  ${RED}•${NC} %s\n" "$linha"
  fi
done
[ ${#NO_BASE[@]} -eq 0 ] && echo -e "  ${GREEN}nenhuma — o base está limpo${NC}"

echo -e "\n${YELLOW}Ferramentas no env do projeto ('$ENV_PROJETO'):${NC}"
if ptm_env_existe "$ENV_PROJETO"; then
  LISTA_PROJ="$(conda list -n "$ENV_PROJETO" 2>/dev/null)"
  encontradas=0
  for f in "${FERRAMENTAS[@]}"; do
    linha="$(echo "$LISTA_PROJ" | grep -E "^${f}[[:space:]]" | head -1)"
    [ -n "$linha" ] && { printf "  ${GREEN}•${NC} %s\n" "$linha"; encontradas=$((encontradas+1)); }
  done
  [ "$encontradas" -eq 0 ] && echo -e "  ${YELLOW}nenhuma — rode: bash scripts/setup_env.sh${NC}"
else
  echo -e "  ${YELLOW}o env '$ENV_PROJETO' não existe — rode: bash scripts/setup_env.sh${NC}"
fi

# ------------------------------------------------------------------ #
# Binários fora de conda
# ------------------------------------------------------------------ #
echo -e "\n${YELLOW}Binários instalados fora do conda (sistema):${NC}"
FORA=0
for b in mafft clustalo muscle FastTree fasttree iqtree iqtree2 iqtree3 raxml-ng mb mrbayes; do
  caminho="$(command -v "$b" 2>/dev/null)"
  case "$caminho" in
    ""|*conda*|*miniforge*|*mamba*) ;;
    *) printf "  ${YELLOW}•${NC} %-10s %s\n" "$b" "$caminho"; FORA=$((FORA+1)) ;;
  esac
done
if [ "$FORA" -gt 0 ]; then
  echo -e "${DIM}  Estes NÃO são removidos por este script: podem ser de outro trabalho seu,${NC}"
  echo -e "${DIM}  e mexer neles é decisão sua. Mas saiba que eles SOMBREIAM o env do${NC}"
  echo -e "${DIM}  projeto quando ele não está ativo — foi assim que este repositório${NC}"
  echo -e "${DIM}  registrou versões erradas por dias.${NC}"
else
  echo -e "  ${GREEN}nenhum${NC}"
fi

# ------------------------------------------------------------------ #
# Ação
# ------------------------------------------------------------------ #
if [ ${#NO_BASE[@]} -eq 0 ]; then
  echo -e "\n${GREEN}✓ Nada a desfazer no 'base'.${NC}"
  exit 0
fi

COMANDO="conda remove -y -n base ${NO_BASE[*]}"

if [ "$APLICAR" -eq 0 ]; then
  echo -e "\n${YELLOW}Para remover do 'base' (nada foi alterado agora):${NC}"
  echo -e "  ${COMANDO}"
  echo -e "  ${DIM}ou: bash scripts/cleanup_env.sh --apply${NC}"
  exit 0
fi

echo -e "\n${RED}Isto vai remover ${#NO_BASE[@]} pacote(s) do env 'base':${NC}"
echo -e "  ${NO_BASE[*]}"
echo -e "${DIM}Se você usa alguma dessas ferramentas fora do PhyloTreeMiner, responda não.${NC}"
printf "Prosseguir? [y/N] "
read -r resposta
case "$resposta" in
  [yY]*) ;;
  *) echo -e "${BLUE}Nada foi alterado.${NC}"; exit 0 ;;
esac

echo -e "\n${YELLOW}${COMANDO}${NC}"
if $COMANDO; then
  echo -e "\n${GREEN}✓ Removidos do 'base'.${NC}"
  echo -e "${DIM}  O env do projeto não foi tocado. Confira com:${NC}"
  echo -e "${DIM}  bash scripts/check_dependencies.sh${NC}"
else
  echo -e "\n${RED}✗ A remoção falhou. Rode o comando à mão para ver o erro completo.${NC}"
  exit 1
fi
