import { describe, it, expect } from 'vitest';
import { filterTree } from '../components/analysis/Tree/treeFiltering';

/**
 * F-10/Arq-C (M5): extraído de `PhylogeneticTreeViewer.applyFilters` sem
 * mudança de comportamento — inclusive a regra pré-existente de que, sem
 * metadado local carregado, nada é filtrado (nem busca textual).
 */

const CAMPOS = [{ field: 'host', label: 'Host' }];

const arvore = () => ({
  name: 'root',
  children: [
    { name: 'A.1', children: [] },
    { name: 'B.1', children: [] },
    { name: 'C.1', children: [] },
  ],
});

const metadados = {
  'A.1': { host: 'Human' },
  'B.1': { host: 'Bat' },
  'C.1': { host: 'Human' },
};

const getLocalMetadata = (nome) => metadados[nome] || null;

function nomes(tree) {
  if (!tree) return [];
  const acc = [];
  const percorrer = (n) => {
    if (n.name && (!n.children || n.children.length === 0)) acc.push(n.name);
    (n.children || []).forEach(percorrer);
  };
  percorrer(tree);
  return acc;
}

describe('filterTree', () => {
  it('sem filtro nem busca, mantém a árvore inteira', () => {
    const resultado = filterTree(arvore(), {
      filters: {},
      searchTerm: '',
      temMetadadoLocal: true,
      getLocalMetadata,
      camposDeBusca: CAMPOS,
    });
    expect(nomes(resultado)).toEqual(['A.1', 'B.1', 'C.1']);
  });

  it('filtra por valor de metadado', () => {
    const resultado = filterTree(arvore(), {
      filters: { host: ['Human'] },
      searchTerm: '',
      temMetadadoLocal: true,
      getLocalMetadata,
      camposDeBusca: CAMPOS,
    });
    expect(nomes(resultado)).toEqual(['A.1', 'C.1']);
  });

  it('busca por nome do terminal', () => {
    const resultado = filterTree(arvore(), {
      filters: {},
      searchTerm: 'b.1',
      temMetadadoLocal: true,
      getLocalMetadata,
      camposDeBusca: CAMPOS,
    });
    expect(nomes(resultado)).toEqual(['B.1']);
  });

  it('busca por campo de metadado quando o nome não bate', () => {
    const resultado = filterTree(arvore(), {
      filters: {},
      searchTerm: 'bat',
      temMetadadoLocal: true,
      getLocalMetadata,
      camposDeBusca: CAMPOS,
    });
    expect(nomes(resultado)).toEqual(['B.1']);
  });

  it('sem metadado local carregado, não filtra nada (nem busca)', () => {
    // Mesma regra do código original: `localIndex.size === 0` fazia
    // `filterNode` devolver `true` incondicionalmente.
    const resultado = filterTree(arvore(), {
      filters: { host: ['Human'] },
      searchTerm: 'não existe',
      temMetadadoLocal: false,
      getLocalMetadata,
      camposDeBusca: CAMPOS,
    });
    expect(nomes(resultado)).toEqual(['A.1', 'B.1', 'C.1']);
  });

  it('devolve null para árvore vazia', () => {
    expect(filterTree(null, { filters: {}, searchTerm: '', temMetadadoLocal: false, getLocalMetadata, camposDeBusca: CAMPOS })).toBeNull();
  });
});
