import { describe, it, expect } from 'vitest';
import { dividirLinha, detectarSeparador } from '../components/common/csv';

/**
 * O visor de tabela dividia a linha por um regex de vírgula-ou-tab. Cada caso
 * abaixo é um arquivo que este projeto **tem em disco** e que aquele parser
 * lia errado — sempre em silêncio, porque o excedente era descartado por
 * `values[i] || ''`.
 */

describe('dividirLinha', () => {
  it('separa campos simples', () => {
    expect(dividirLinha('a,b,c', ',')).toEqual(['a', 'b', 'c']);
  });

  it('não quebra na vírgula dentro de aspas', () => {
    // É o campo `strain` do GenBank: "Bangladesh 1974, nur islam".
    expect(dividirLinha('DQ437581,"Bangladesh 1974, nur islam",1974', ',')).toEqual([
      'DQ437581',
      'Bangladesh 1974, nur islam',
      '1974',
    ]);
  });

  it('preserva o número de colunas de um itemset do FPMax', () => {
    // Cada itemset é uma lista de clados separada por vírgula, entre aspas.
    // Com o parser antigo, esta linha virava 5 colunas em vez de 3.
    const linha = '"clado_a,clado_b,clado_c",8,0.75';
    expect(dividirLinha(linha, ',')).toHaveLength(3);
    expect(dividirLinha(linha, ',')[0]).toBe('clado_a,clado_b,clado_c');
  });

  it('trata aspas duplas escapadas como uma aspa literal', () => {
    expect(dividirLinha('a,"diz ""oi"" aqui",c', ',')).toEqual([
      'a',
      'diz "oi" aqui',
      'c',
    ]);
  });

  it('mantém campo vazio em vez de descartá-lo', () => {
    // Coluna vazia é um fato sobre a linha; sumir com ela desloca as seguintes.
    expect(dividirLinha('a,,c', ',')).toEqual(['a', '', 'c']);
    expect(dividirLinha('a,b,', ',')).toEqual(['a', 'b', '']);
  });

  it('separa por tab quando o separador é tab', () => {
    expect(dividirLinha('a\tb\tc', '\t')).toEqual(['a', 'b', 'c']);
  });

  it('não confunde vírgula com separador num arquivo tab', () => {
    expect(dividirLinha('a,b\tc', '\t')).toEqual(['a,b', 'c']);
  });
});

describe('detectarSeparador', () => {
  it('reconhece vírgula', () => {
    expect(detectarSeparador('itemsets,support,n_trees')).toBe(',');
  });

  it('reconhece tab', () => {
    expect(detectarSeparador('itemsets\tsupport\tn_trees')).toBe('\t');
  });

  it('ignora vírgulas que estão dentro de aspas', () => {
    // Um único campo com muitas vírgulas não pode decidir o separador do
    // arquivo inteiro.
    expect(detectarSeparador('"a,b,c,d,e"\tsupport\tn')).toBe('\t');
  });
});
