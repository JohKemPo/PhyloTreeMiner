// D12/D16 (ver docs/science/02-defeitos-que-alteram-resultado.md): ausência de
// geolocalização e data de coleta em registros históricos do GenBank é uma
// limitação dos dados de origem, não um defeito do pipeline. Esta função só
// mede quanto do valor exibido é semântico (veio do NCBI) contra placeholder.
const UNKNOWN_VALUES = new Set(["Unknown", "Unknown Date", "", null, undefined]);

export const LOW_COVERAGE_THRESHOLD_PCT = 50;

export const computeFieldCoverage = (sequences, field) => {
  const total = sequences.length;
  if (total === 0) return { known: 0, total: 0, pct: 100 };
  const known = sequences.filter((seq) => !UNKNOWN_VALUES.has(seq[field])).length;
  return { known, total, pct: Math.round((known / total) * 100) };
};
