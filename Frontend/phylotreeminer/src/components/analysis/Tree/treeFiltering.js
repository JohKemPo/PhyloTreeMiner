/**
 * Filtro de árvore extraído de `PhylogeneticTreeViewer.applyFilters`
 * (F-10/Arq-C, M5) — mesma lógica, agora uma função pura: recebe a árvore
 * já analisada e o contexto de filtro em vez de fechar sobre estado do
 * componente, o que a torna testável sem montar D3/antd.
 *
 * @param {object} treeData - raiz da árvore (`newickParser.parseNewick`/`universalTreeParser`).
 * @param {object} contexto
 * @param {Record<string,string[]>} contexto.filters - valores permitidos por campo (`{host: ["Human"]}`).
 * @param {string} contexto.searchTerm - termo de busca (nome do nó ou metadado).
 * @param {boolean} contexto.temMetadadoLocal - `localIndex.size > 0`; sem metadado local carregado, nada é filtrado (mesma regra do código original).
 * @param {(nodeName: string) => object|null} contexto.getLocalMetadata - metadado local do nó, pelo nome.
 * @param {{field: string, label: string}[]} contexto.camposDeBusca - campos considerados na busca textual.
 * @returns {object|null} a árvore filtrada, ou `null` se nada sobrar.
 */
export function filterTree(
  treeData,
  { filters, searchTerm, temMetadadoLocal, getLocalMetadata, camposDeBusca },
) {
  if (!treeData) return null;

  const filterNode = (node) => {
    if (!temMetadadoLocal || !node.name) return true;

    const info = getLocalMetadata(node.name);

    for (const [field, values] of Object.entries(filters || {})) {
      if (values.length > 0) {
        const nodeValue = info ? info[field] : null;
        if (!values.includes(nodeValue)) {
          return false;
        }
      }
    }

    if (searchTerm) {
      const alvo = searchTerm.toLowerCase();
      let matchesSearch = node.name.toLowerCase().includes(alvo);

      if (!matchesSearch && info) {
        matchesSearch = (camposDeBusca || []).some(({ field }) =>
          String(info[field] ?? "").toLowerCase().includes(alvo),
        );
      }

      if (!matchesSearch) return false;
    }

    return true;
  };

  const filterNodeRecursive = (node) => {
    const newNode = { ...node };

    if (newNode.children) {
      newNode.children = newNode.children
        .map(filterNodeRecursive)
        .filter((child) => child !== null);

      if (newNode.children.length > 0 || filterNode(newNode)) {
        return newNode;
      }
    }

    return filterNode(newNode) ? newNode : null;
  };

  return filterNodeRecursive(treeData);
}
