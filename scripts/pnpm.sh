#!/usr/bin/env bash
# ==============================================================================
# Invoca o pnpm com um Node que ele aceite.
#
# Existe porque o Makefile e a CI chamam `pnpm` direto, sem passar pela
# biblioteca — e um `pnpm` no PATH sob Node velho aborta em toda chamada. Toda a
# lógica continua em lib_node.sh; aqui só se aplica o resultado.
#
# Uso:  bash scripts/pnpm.sh <argumentos do pnpm>
# ==============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$RAIZ/scripts/lib_node.sh"

ptm_ativar_node || true

if ! ptm_pnpm_roda; then
  garantir_pnpm >&2 || exit 1
fi

exec pnpm "$@"
