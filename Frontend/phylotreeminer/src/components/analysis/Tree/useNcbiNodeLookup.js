import { useCallback, useState } from "react";
import { fetchNcbiInfo } from "../../../services/dataServices";

/**
 * Consulta ao NCBI para o nó selecionado, extraída de
 * `PhylogeneticTreeViewer.handleNodeClick` (F-10/Arq-C, M5) — mesma
 * chamada, mesmo tratamento de erro (silencioso: volta a `null`), só
 * isolada para o componente principal não precisar saber como o dado
 * chega.
 *
 * @returns {{ncbiInfo: object|null, ncbiLoading: boolean, lookup: (accession: string) => void, reset: () => void}}
 */
export function useNcbiNodeLookup() {
  const [ncbiInfo, setNcbiInfo] = useState(null);
  const [ncbiLoading, setNcbiLoading] = useState(false);

  const lookup = useCallback((accession) => {
    setNcbiLoading(true);
    fetchNcbiInfo(accession)
      .then((info) => setNcbiInfo(info))
      .catch(() => setNcbiInfo(null))
      .finally(() => setNcbiLoading(false));
  }, []);

  const reset = useCallback(() => {
    setNcbiInfo(null);
  }, []);

  return { ncbiInfo, ncbiLoading, lookup, reset };
}
