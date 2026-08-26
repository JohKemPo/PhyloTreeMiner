#!/usr/bin/env bash
# ==============================================================================
# Node e pnpm — um lugar só.
#
# O projeto usa **pnpm**, fixado em `packageManager` no package.json. O pnpm 11
# **recusa-se a rodar** em Node anterior a 22.13: ele não avisa e continua, ele
# sai com erro. Por isso o mínimo aqui não é estético — é o que a ferramenta
# exige para executar.
#
# A lição vem do `check_dependencies.sh`: **existir não é servir.** Lá, uma
# ferramenta encontrada fora do env do projeto é sinalizada em vez de aceita;
# aqui, um `pnpm` que está no PATH mas aborta em toda invocação não conta como
# disponível. A ordem de resolução é a mesma: variável explícita > o que já está
# no PATH, se atender > nvm > pedir ação do usuário.
#
# Uso:  source "$(dirname "${BASH_SOURCE[0]}")/lib_node.sh"
#       garantir_pnpm || exit 1
# ==============================================================================

# Mínimo exigido pelo pnpm 11.x (o da chave `packageManager`). Ao subir o pnpm,
# confira o mínimo dele e ajuste estes dois números juntos.
PTM_NODE_MINIMO_MAIOR=22
PTM_NODE_MINIMO_MENOR=13
PTM_NODE_MINIMO="${PTM_NODE_MINIMO_MAIOR}.${PTM_NODE_MINIMO_MENOR}"

# Versão de um executável do Node como inteiro comparável (maior*1000+menor).
# Vazio se o comando não existe ou não responde `vX.Y.Z`.
ptm_node_num() {
  local cmd="${1:-node}" bruto maior menor
  command -v "$cmd" >/dev/null 2>&1 || return 1
  bruto="$("$cmd" -v 2>/dev/null)" || return 1
  bruto="${bruto#v}"
  maior="${bruto%%.*}"
  menor="${bruto#*.}"; menor="${menor%%.*}"
  case "$maior$menor" in ''|*[!0-9]*) return 1 ;; esac
  echo $(( maior * 1000 + menor ))
}

# 0 se o Node visível no PATH atende ao mínimo do pnpm.
ptm_node_ok() {
  local n
  n="$(ptm_node_num "${1:-node}")" || return 1
  [ "$n" -ge $(( PTM_NODE_MINIMO_MAIOR * 1000 + PTM_NODE_MINIMO_MENOR )) ]
}

# Tenta pôr no PATH um Node que atenda ao mínimo, sem exigir administrador.
# Devolve 0 se conseguiu; não altera nada se o Node atual já serve.
ptm_ativar_node() {
  local FRACO='\033[2m' AZUL='\033[0;34m' FIM='\033[0m'

  # 1. Override explícito, para quem tem o Node fora dos caminhos usuais.
  if [ -n "${PTM_NODE_BIN:-}" ] && ptm_node_ok "${PTM_NODE_BIN}/node"; then
    PATH="${PTM_NODE_BIN}:$PATH"; export PATH
    return 0
  fi

  # 2. O que já está no PATH, se atender.
  ptm_node_ok && return 0

  # 3. nvm. É instalação de usuário, não precisa de sudo, e é comum a máquina
  #    já ter o Node novo lá enquanto `/usr/bin/node` continua no antigo — que
  #    foi exatamente o caso que motivou esta função.
  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$nvm_dir/nvm.sh" ]; then
    local anterior; anterior="$(node -v 2>/dev/null)"
    # shellcheck disable=SC1090,SC1091
    NVM_DIR="$nvm_dir" . "$nvm_dir/nvm.sh" >/dev/null 2>&1
    if command -v nvm >/dev/null 2>&1; then
      nvm use "$PTM_NODE_MINIMO" >/dev/null 2>&1 \
        || nvm use "$PTM_NODE_MINIMO_MAIOR" >/dev/null 2>&1 \
        || nvm use default >/dev/null 2>&1 \
        || nvm use node >/dev/null 2>&1
      if ptm_node_ok; then
        echo -e "  ${AZUL}ℹ${FIM} Node $(node -v) pelo nvm${anterior:+ ${FRACO}(o do PATH era $anterior, anterior ao $PTM_NODE_MINIMO)${FIM}}"
        return 0
      fi
    fi
  fi

  return 1
}

# 0 se o pnpm existe **e executa**. `command -v` não basta: o pnpm 11 instalado
# sob um Node velho está no PATH e aborta em toda chamada.
ptm_pnpm_roda() {
  local v
  command -v pnpm >/dev/null 2>&1 || return 1
  v="$(pnpm --version 2>/dev/null)" || return 1
  [ -n "$v" ]
}

# Garante o pnpm utilizável no PATH. Devolve 0 se conseguiu.
garantir_pnpm() {
  local VERDE='\033[0;32m' AMARELO='\033[1;33m' VERMELHO='\033[0;31m' AZUL='\033[0;34m' FRACO='\033[2m' FIM='\033[0m'

  # O Node vem primeiro: sem ele adequado, nenhum pnpm roda.
  ptm_ativar_node

  if ptm_pnpm_roda; then
    echo -e "  ${VERDE}✓${FIM} pnpm $(pnpm --version 2>/dev/null)"
    return 0
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo -e "  ${VERMELHO}✗${FIM} Node.js não encontrado."
    echo -e "    ${FRACO}nvm (sem administrador): https://github.com/nvm-sh/nvm${FIM}"
    echo -e "    ${FRACO}Ubuntu/Debian:           sudo apt install nodejs npm${FIM}"
    return 1
  fi

  # Node presente mas velho: diga o que trava, e não deixe seguir como se
  # estivesse tudo bem — foi assim que o frontend subiu e morreu 15 s depois.
  if ! ptm_node_ok; then
    echo -e "  ${VERMELHO}✗${FIM} Node $(node -v) é anterior ao ${PTM_NODE_MINIMO}, que o pnpm 11 exige para executar."
    if command -v pnpm >/dev/null 2>&1; then
      echo -e "    ${FRACO}O pnpm está no PATH ($(command -v pnpm)) e aborta em toda chamada.${FIM}"
    fi
    echo -e "    ${FRACO}Escolha uma:${FIM}"
    echo -e "    ${FRACO}  nvm install ${PTM_NODE_MINIMO_MAIOR} && nvm alias default ${PTM_NODE_MINIMO_MAIOR}${FIM}"
    echo -e "    ${FRACO}  https://nodejs.org — instale o 22 LTS ou mais novo${FIM}"
    return 1
  fi

  # Node adequado, pnpm ausente. 1ª tentativa: corepack, que vem com o Node e
  # não exige administrador.
  if command -v corepack >/dev/null 2>&1; then
    echo -e "  ${AZUL}ℹ${FIM} pnpm ausente; ligando pelo corepack..."
    if corepack enable >/dev/null 2>&1 && ptm_pnpm_roda; then
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
    if npm install -g pnpm >/dev/null 2>&1 && ptm_pnpm_roda; then
      echo -e "  ${VERDE}✓${FIM} pnpm $(pnpm --version 2>/dev/null)"
      return 0
    fi
  fi

  echo -e "  ${VERMELHO}✗${FIM} Não consegui disponibilizar o pnpm automaticamente."
  echo -e "    ${FRACO}Escolha uma:${FIM}"
  echo -e "    ${FRACO}  corepack enable${FIM}"
  echo -e "    ${FRACO}  npm install -g pnpm${FIM}"
  echo -e "    ${FRACO}  curl -fsSL https://get.pnpm.io/install.sh | sh -${FIM}"
  return 1
}
