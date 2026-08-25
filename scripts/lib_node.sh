#!/usr/bin/env bash
# ==============================================================================
# Node e pnpm — um lugar só.
#
# O projeto usa **pnpm** (campo `packageManager` do package.json). Ele não
# precisa de instalação global: acompanha o Node através do `corepack`, que só
# precisa ser ligado. Esta biblioteca tenta, em ordem, o que não exige
# privilégio de administrador, e só depois pede ação do usuário.
#
# Uso:  source "$(dirname "${BASH_SOURCE[0]}")/lib_node.sh"
#       garantir_pnpm || exit 1
# ==============================================================================

PTM_NODE_MINIMO=20

# 0 se o Node existe e é recente o bastante.
ptm_node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  local maior
  maior="$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')"
  [ -n "$maior" ] && [ "$maior" -ge "$PTM_NODE_MINIMO" ]
}

# Garante o pnpm disponível no PATH. Devolve 0 se conseguiu.
garantir_pnpm() {
  local VERDE='\033[0;32m' AMARELO='\033[1;33m' VERMELHO='\033[0;31m' AZUL='\033[0;34m' FRACO='\033[2m' FIM='\033[0m'

  if command -v pnpm >/dev/null 2>&1; then
    echo -e "  ${VERDE}✓${FIM} pnpm $(pnpm --version 2>/dev/null)"
    return 0
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo -e "  ${VERMELHO}✗${FIM} Node.js não encontrado."
    echo -e "    ${FRACO}Ubuntu/Debian: sudo apt install nodejs npm${FIM}"
    echo -e "    ${FRACO}ou nvm:        https://github.com/nvm-sh/nvm${FIM}"
    return 1
  fi

  if ! ptm_node_ok; then
    echo -e "  ${AMARELO}⚠${FIM} Node $(node -v) é anterior ao ${PTM_NODE_MINIMO}; o build do Vite pode falhar."
  fi

  # 1ª tentativa: corepack. Vem com o Node e não exige administrador.
  if command -v corepack >/dev/null 2>&1; then
    echo -e "  ${AZUL}ℹ${FIM} pnpm ausente; ligando pelo corepack..."
    if corepack enable >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1; then
      echo -e "  ${VERDE}✓${FIM} pnpm $(pnpm --version 2>/dev/null) via corepack"
      return 0
    fi
    # `corepack enable` escreve no diretório de binários do Node, que numa
    # instalação de sistema (/usr/bin) pertence ao root.
    echo -e "  ${AMARELO}⚠${FIM} corepack não conseguiu escrever no diretório do Node."
  fi

  # 2ª tentativa: instalação global pelo npm, sem privilégio se o prefixo for do usuário.
  if command -v npm >/dev/null 2>&1; then
    echo -e "  ${AZUL}ℹ${FIM} tentando 'npm install -g pnpm'..."
    if npm install -g pnpm >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1; then
      echo -e "  ${VERDE}✓${FIM} pnpm $(pnpm --version 2>/dev/null)"
      return 0
    fi
  fi

  echo -e "  ${VERMELHO}✗${FIM} Não consegui disponibilizar o pnpm automaticamente."
  echo -e "    ${FRACO}Escolha uma:${FIM}"
  echo -e "    ${FRACO}  sudo corepack enable${FIM}"
  echo -e "    ${FRACO}  sudo npm install -g pnpm${FIM}"
  echo -e "    ${FRACO}  curl -fsSL https://get.pnpm.io/install.sh | sh -${FIM}"
  return 1
}
