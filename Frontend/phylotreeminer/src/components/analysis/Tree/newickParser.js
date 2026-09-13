/**
 * Analisador de árvore (Newick/Nexus) e utilitários puros extraídos de
 * `PhylogeneticTreeViewer` (F-10/Arq-C, M5) — nenhuma mudança de
 * comportamento em relação ao código original, só de lugar: são funções
 * puras, então dá para testar isoladamente sem montar o componente inteiro.
 *
 * Há um outro `universalTreeParser`/`parseNewick` em
 * `components/analysis/utils/treeUtils.jsx`, mas é uma implementação
 * diferente (mensagens de erro e formato do nó não coincidem) e não tem
 * nenhum consumidor hoje — não é o parser que este componente usa, e não é
 * seguro unificar os dois sem antes confirmar que produzem exatamente a
 * mesma árvore para os arquivos já em uso.
 */

/** Mesma normalização do backend (`accession_base`): sem a versão do acesso. */
export const acessoBase = (rotulo) => (rotulo ? rotulo.split(".")[0] : rotulo);

/**
 * Analisa uma string no formato Newick e devolve o nó raiz hierárquico
 * (`{ name?, length?, children }`) que `d3.hierarchy` consome.
 *
 * @param {string} newick
 * @returns {{name?: string, length?: number, children: object[]}}
 */
export function parseNewick(newick) {
  let index = 0;
  const tokens = newick
    .split(/\s*(;|\(|\)|,|:)\s*/)
    .filter((token) => token.trim() !== "");
  let currentToken = tokens[index];

  const expect = (expected) => {
    if (currentToken === expected) {
      index++;
      currentToken = tokens[index];
    } else {
      throw new Error(`Expected ${expected}, found ${currentToken}`);
    }
  };

  const parseNode = () => {
    let node = { children: [] };
    if (currentToken === "(") {
      expect("(");
      node.children.push(parseNode());
      while (currentToken === ",") {
        expect(",");
        node.children.push(parseNode());
      }
      expect(")");
    }

    if (currentToken && !["(", ")", ",", ":", ";"].includes(currentToken)) {
      node.name = currentToken;
      index++;
      currentToken = tokens[index];
    }

    if (currentToken === ":") {
      expect(":");
      if (currentToken && !isNaN(parseFloat(currentToken))) {
        node.length = parseFloat(currentToken);
        index++;
        currentToken = tokens[index];
      }
    }

    return node;
  };

  const tree = parseNode();
  if (currentToken !== ";") {
    throw new Error("Expected ; at end of newick string");
  }
  return tree;
}

/**
 * Detecta o formato (Newick puro ou árvore embutida num arquivo Nexus) e
 * devolve o nó raiz hierárquico. Lança `Error` com mensagem amigável para
 * FASTA e formatos não reconhecidos.
 *
 * @param {string} fileContent
 */
export function universalTreeParser(fileContent) {
  const content = fileContent.trim();

  if (content.toUpperCase().startsWith("#NEXUS")) {
    const treeMatch = content.match(/tree\s+.*?=\s*(\(.*?;)/is);
    if (treeMatch && treeMatch[1]) {
      const newickString = treeMatch[1];
      return parseNewick(newickString);
    }
    throw new Error(
      'Valid Nexus file, but no tree was found in the "TREE ... = (...);" format'
    );
  }

  if (content.startsWith("(") || content.includes(";")) {
    return parseNewick(content);
  }

  if (content.startsWith(">")) {
    throw new Error(
      "FASTA format detected. Please upload a tree file (.nwk, .nexus)."
    );
  }

  throw new Error("Unrecognized tree file format.");
}

/** Conta todos os nós (internos + folhas) de uma árvore já analisada. */
export function countNodes(treeData) {
  let count = 0;
  const countRecursive = (node) => {
    count++;
    if (node.children) {
      node.children.forEach(countRecursive);
    }
  };
  countRecursive(treeData);
  return count;
}
