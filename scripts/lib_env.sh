#!/usr/bin/env bash
# ==============================================================================
# Resolução do ambiente conda do projeto — um lugar só.
#
# Existe porque três scripts precisam concordar sobre QUAL env é o do projeto.
# Duas listas de nomes divergindo é o defeito D5 em outro assunto.
#
# O nome é resolvido sem diferenciar maiúsculas: esta base tinha um env
# `Phylotreeminer` de antes da receita, e procurar por `phylotreeminer` exato
# faria os scripts criarem um segundo env em vez de reaproveitar o existente.
#
# Uso:  source "$(dirname "${BASH_SOURCE[0]}")/lib_env.sh"
# ==============================================================================

#: Nome canônico da receita. `PTM_ENV` sobrepõe e é usado literalmente.
PTM_ENV_PADRAO="phylotreeminer"

# Nome do env do projeto: PTM_ENV literal, ou o env existente cujo nome bate
# sem diferenciar maiúsculas, ou o padrão da receita.
ptm_env_nome() {
  if [ -n "${PTM_ENV:-}" ]; then echo "$PTM_ENV"; return 0; fi

  local existente
  existente="$(conda env list 2>/dev/null | awk '{print $1}' \
    | grep -ixF "$PTM_ENV_PADRAO" | head -1)"

  echo "${existente:-$PTM_ENV_PADRAO}"
}

# 0 se o env existe.
ptm_env_existe() {
  conda env list 2>/dev/null | awk '{print $1}' | grep -qxF "$1"
}

# Diretório `bin` do env, ou vazio.
ptm_env_bin() {
  local bin
  bin="$(conda run -n "$1" python -c 'import sys,os; print(os.path.dirname(sys.executable))' 2>/dev/null)"
  [ -d "${bin:-}" ] && echo "$bin"
}
