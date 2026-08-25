#!/usr/bin/env bash
# ==============================================================================
# Verificação de dependências do PhyloTreeMiner
#
# Confere as ferramentas externas que o pipeline invoca **dentro do ambiente do
# projeto**, e não no PATH ambiente. A distinção não é preciosismo: nesta base,
# o env conda tem FastTree 2.2.0 e RAxML-NG 1.2.2 enquanto o PATH resolvia
# 2.1.11 e 1.1.0 de /usr/bin e /usr/local/bin. Medir o PATH e chamar aquilo de
# "as versões do projeto" produziu um registro errado que durou dias.
#
#   bash scripts/check_dependencies.sh              # só relata
#   bash scripts/check_dependencies.sh --install    # instala o que falta NO ENV
#   bash scripts/check_dependencies.sh --quiet      # só o resumo
#   PTM_BIN=/caminho/do/env/bin bash scripts/check_dependencies.sh
#
# Código de saída: 0 se nada essencial falta; 1 caso contrário.
# ==============================================================================

set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; DIM='\033[2m'; NC='\033[0m'

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib_env.sh"
ENV_NOME="$(ptm_env_nome)"
INSTALAR=0
QUIETO=0
for arg in "$@"; do
  case "$arg" in
    --install) INSTALAR=1 ;;
    --quiet)   QUIETO=1 ;;
  esac
done

# ------------------------------------------------------------------ #
# Onde procurar. Ordem: PTM_BIN explícito > env do projeto > PATH (com aviso).
# ------------------------------------------------------------------ #
ORIGEM=""
if [ -n "${PTM_BIN:-}" ] && [ -d "$PTM_BIN" ]; then
  BIN="$PTM_BIN"; ORIGEM="PTM_BIN"
elif command -v conda >/dev/null 2>&1 && ptm_env_existe "$ENV_NOME"; then
  BIN="$(ptm_env_bin "$ENV_NOME")"
  ORIGEM="env $ENV_NOME"
  [ -n "$BIN" ] || ORIGEM=""
fi

if [ -z "${BIN:-}" ]; then
  BIN=""
  ORIGEM="PATH do sistema"
fi

# Resolve um binário: primeiro no bin do env, depois no PATH.
onde() {
  local nome="$1"
  if [ -n "$BIN" ] && [ -x "$BIN/$nome" ]; then echo "$BIN/$nome"; return 0; fi
  command -v "$nome" 2>/dev/null
}

FALTANDO_ESSENCIAL=()
FALTANDO_OPCIONAL=()
PACOTES_CONDA=()
FORA_DO_ENV=()

# nome | candidatos de binário | essencial | args de versão | pacote conda
#
# Os candidatos são uma LISTA porque o nome do binário não acompanha o do
# pacote: `iqtree` 3.x instala `iqtree` e `iqtree3`, e não instala `iqtree2`.
# Fixar um nome só quebra a cada versão nova do bioconda.
FERRAMENTAS=(
  "MAFFT|mafft|1|--version|mafft"
  "Clustal Omega|clustalo|1|--version|clustalo"
  "MUSCLE|muscle|1|-version|muscle"
  "FastTree|FastTree fasttree|1||fasttree"
  "IQ-TREE|iqtree3 iqtree2 iqtree|1|--version|iqtree"
  "RAxML-NG|raxml-ng|1|--version|raxml-ng"
  "MrBayes|mb mrbayes|0||mrbayes"
)

versao_de() {
  local caminho="$1" args="$2" saida
  if [ -n "$args" ]; then
    saida=$("$caminho" $args </dev/null 2>&1 | head -5)
  else
    # FastTree e MrBayes imprimem a versão no banner e LEEM a entrada padrão:
    # sem `</dev/null` ficam bloqueados esperando dados.
    saida=$("$caminho" </dev/null 2>&1 | head -5)
  fi
  echo "$saida" | grep -oiE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1
}

[ "$QUIETO" -eq 0 ] && {
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  DEPENDÊNCIAS DE BIOINFORMÁTICA${NC}"
  echo -e "${BLUE}  ${DIM}procurando em: ${ORIGEM}${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
}

if [ "$ORIGEM" = "PATH do sistema" ] && [ "$QUIETO" -eq 0 ]; then
  echo -e "${YELLOW}  ⚠ O env '$ENV_NOME' não foi encontrado. As versões abaixo são as do${NC}"
  echo -e "${YELLOW}    sistema, que podem não ser as que o pipeline usará.${NC}"
  echo -e "${DIM}    Crie o ambiente do projeto: bash scripts/setup_env.sh${NC}\n"
fi

for entrada in "${FERRAMENTAS[@]}"; do
  IFS='|' read -r nome candidatos essencial args pacote <<< "$entrada"

  achado=""
  for b in $candidatos; do
    caminho="$(onde "$b")"
    [ -n "$caminho" ] && { achado="$caminho"; nome_bin="$b"; break; }
  done

  if [ -n "$achado" ]; then
    v=$(versao_de "$achado" "$args")
    marca=""
    # Binário fora do env é sinal de sombreamento — a causa do registro errado
    # de versão que este projeto carregou.
    if [ -n "$BIN" ] && [[ "$achado" != "$BIN/"* ]]; then
      marca=" ${YELLOW}(fora do env: $achado)${NC}"
      FORA_DO_ENV+=("$nome")
      # Entra na lista de instalação: presente no sistema não é presente no
      # projeto. Foi assim que MUSCLE 3.8 do sistema apareceu num registro que
      # dizia usar o env — versões diferentes, resultados diferentes.
      PACOTES_CONDA+=("$pacote")
    fi
    [ "$QUIETO" -eq 0 ] && printf "  ${GREEN}✓${NC} %-16s %-10s ${DIM}%s${NC}%b\n" \
      "$nome" "${v:-?}" "$nome_bin" "$marca"
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
# Instalação — sempre com -n, nunca no env ativo
# ------------------------------------------------------------------ #
if [ ${#PACOTES_CONDA[@]} -gt 0 ]; then
  GESTOR=""
  command -v mamba >/dev/null 2>&1 && GESTOR="mamba"
  [ -z "$GESTOR" ] && command -v conda >/dev/null 2>&1 && GESTOR="conda"

  if [ -z "$GESTOR" ]; then
    [ "$QUIETO" -eq 0 ] && echo -e "\n${YELLOW}Nem conda nem mamba no PATH.${NC}"
  else
    # `-n "$ENV_NOME"` é o que impede a instalação de cair no env ativo, que
    # costuma ser o `base`. Sem isso, o projeto contamina a máquina inteira.
    COMANDO="$GESTOR install -y -n $ENV_NOME -c conda-forge -c bioconda ${PACOTES_CONDA[*]}"
    if [ "$INSTALAR" -eq 1 ]; then
      if ! ptm_env_existe "$ENV_NOME"; then
        echo -e "\n${RED}✗ O env '$ENV_NOME' não existe. Crie-o antes:${NC}"
        echo -e "  ${BLUE}bash scripts/setup_env.sh${NC}"
        exit 1
      fi
      echo -e "\n${YELLOW}Instalando no env '$ENV_NOME':${NC}\n  ${COMANDO}\n"
      $COMANDO || { echo -e "${RED}✗ A instalação falhou.${NC}"; exit 1; }
      echo -e "${GREEN}✓ Concluído. Rode este script de novo para conferir.${NC}"
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
if [ ${#FORA_DO_ENV[@]} -gt 0 ] && [ "$QUIETO" -eq 0 ]; then
  echo -e "\n${YELLOW}⚠ ${#FORA_DO_ENV[@]} ferramenta(s) resolvidas FORA do env: ${FORA_DO_ENV[*]}${NC}"
  echo -e "${DIM}  Elas não estão no env do projeto, então a versão que o pipeline usa${NC}"
  echo -e "${DIM}  depende do PATH de quem rodar — o registro deixa de ser reproduzível.${NC}"
  echo -e "${DIM}  Instale-as no env: bash scripts/check_dependencies.sh --install${NC}"
fi

if [ ${#FALTANDO_ESSENCIAL[@]} -gt 0 ]; then
  echo -e "${RED}✗ Faltam ${#FALTANDO_ESSENCIAL[@]} ferramenta(s) essencial(is): ${FALTANDO_ESSENCIAL[*]}${NC}"
  exit 1
fi

if [ ${#FALTANDO_OPCIONAL[@]} -gt 0 ]; then
  echo -e "${YELLOW}○ Opcional(is) ausente(s): ${FALTANDO_OPCIONAL[*]} — o método correspondente ficará indisponível.${NC}"
fi

[ "$QUIETO" -eq 0 ] && echo -e "${GREEN}✓ Todas as ferramentas essenciais estão presentes.${NC}"
exit 0
