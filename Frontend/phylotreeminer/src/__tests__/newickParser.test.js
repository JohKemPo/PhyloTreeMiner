import { describe, it, expect } from 'vitest';
import {
  universalTreeParser,
  parseNewick,
  countNodes,
  acessoBase,
} from '../components/analysis/Tree/newickParser';

/**
 * F-10/Arq-C (M5): estas funções vieram de dentro de `PhylogeneticTreeViewer`
 * sem mudança de comportamento — os casos abaixo caracterizam o que já
 * funcionava antes da extração (golden, não especificação nova).
 */

describe('parseNewick', () => {
  it('analisa uma árvore simples com comprimento de ramo', () => {
    const tree = parseNewick('(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);');
    expect(tree.children).toHaveLength(3);
    expect(tree.children[0]).toMatchObject({ name: 'A', length: 0.1 });
    expect(tree.children[1]).toMatchObject({ name: 'B', length: 0.2 });
    const clado = tree.children.find((c) => c.children?.length);
    expect(clado.children.map((c) => c.name)).toEqual(['C', 'D']);
    expect(clado.length).toBe(0.5);
  });

  it('analisa uma árvore sem comprimento de ramo', () => {
    const tree = parseNewick('(A,B,C);');
    expect(tree.children.map((c) => c.name)).toEqual(['A', 'B', 'C']);
    expect(tree.children.every((c) => c.length === undefined)).toBe(true);
  });

  it('lança erro quando falta o ";" final', () => {
    expect(() => parseNewick('(A,B)')).toThrow('Expected ; at end of newick string');
  });
});

describe('universalTreeParser', () => {
  it('detecta Newick puro', () => {
    const tree = universalTreeParser('(A:0.1,B:0.1);');
    expect(tree.children.map((c) => c.name)).toEqual(['A', 'B']);
  });

  it('extrai a árvore de um bloco Nexus', () => {
    const nexus = `#NEXUS\nBEGIN TREES;\nTREE tree1 = (A:0.1,B:0.2);\nEND;`;
    const tree = universalTreeParser(nexus);
    expect(tree.children.map((c) => c.name)).toEqual(['A', 'B']);
  });

  it('rejeita FASTA com mensagem específica', () => {
    expect(() => universalTreeParser('>seq1\nACGT')).toThrow(/FASTA format detected/);
  });

  it('rejeita Nexus válido sem bloco TREE', () => {
    expect(() => universalTreeParser('#NEXUS\nBEGIN TAXA;\nEND;')).toThrow(
      /no tree was found/,
    );
  });

  it('rejeita formato não reconhecido', () => {
    expect(() => universalTreeParser('qualquer coisa')).toThrow(
      'Unrecognized tree file format.',
    );
  });
});

describe('countNodes', () => {
  it('conta nós internos e folhas', () => {
    const tree = parseNewick('(A:0.1,(B:0.1,C:0.1):0.2);');
    // raiz + A + nó interno + B + C = 5
    expect(countNodes(tree)).toBe(5);
  });

  it('conta 1 para uma árvore de um único nó', () => {
    expect(countNodes({ children: [] })).toBe(1);
  });
});

describe('acessoBase', () => {
  it('remove a versão do número de acesso', () => {
    expect(acessoBase('NC_008030.1')).toBe('NC_008030');
  });

  it('devolve o valor original quando não há versão', () => {
    expect(acessoBase('Inner3')).toBe('Inner3');
  });

  it('preserva valores vazios/nulos sem lançar', () => {
    expect(acessoBase('')).toBe('');
    expect(acessoBase(null)).toBe(null);
  });
});
