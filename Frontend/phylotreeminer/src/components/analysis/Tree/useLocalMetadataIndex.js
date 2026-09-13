import { useCallback, useEffect, useState } from "react";
import { httpGet } from "../../../services/http";
import { acessoBase } from "./newickParser";

/**
 * Índice leve de metadado do projeto (`accessionId -> {host,country,...}`),
 * extraído de `PhylogeneticTreeViewer` (F-10/Arq-C, M5) — mesmo fetch e
 * mesma forma de resultado, só isolados num hook próprio.
 *
 * Não usa `useQuery` de propósito: `zoomCleanup.test.jsx` monta
 * `PhylogeneticTreeViewer` direto, sem `QueryClientProvider` — trocar por
 * React Query aqui quebraria esse teste sem tocar em nada relacionado a ele.
 *
 * @param {string|null} projectName
 * @returns {{localIndex: Map<string,object>, getLocalMetadata: (nodeName: string) => object|null}}
 */
export function useLocalMetadataIndex(projectName) {
  const [localIndex, setLocalIndex] = useState(new Map());

  useEffect(() => {
    if (!projectName) {
      setLocalIndex(new Map());
      return undefined;
    }
    let cancelado = false;
    httpGet(`/api/tree/${projectName}/search-nodes`)
      .then((linhas) => {
        if (cancelado) return;
        const mapa = new Map();
        (linhas || []).forEach((linha) => {
          if (linha.accessionId) mapa.set(linha.accessionId, linha);
        });
        setLocalIndex(mapa);
      })
      .catch(() => {
        if (!cancelado) setLocalIndex(new Map());
      });
    return () => {
      cancelado = true;
    };
  }, [projectName]);

  const getLocalMetadata = useCallback(
    (nodeName) => localIndex.get(acessoBase(nodeName)) || null,
    [localIndex],
  );

  return { localIndex, getLocalMetadata };
}
