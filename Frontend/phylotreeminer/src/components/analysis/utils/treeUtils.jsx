/**
 * Analisador universal que detecta o formato (Newick, Nexus) e extrai a string da árvore.
 * @param {string} fileContent O conteúdo bruto do arquivo da árvore.
 * @returns {object} Um objeto de nó hierárquico compatível com D3.
 */
export const universalTreeParser = (fileContent) => {
  const content = fileContent.trim();
  
  if (content.toUpperCase().startsWith('#NEXUS')) {
    const treeMatch = content.match(/TREE\s+.*?=\s*(.*?;)/is);
    if (treeMatch && treeMatch[1]) {
      const newickString = treeMatch[1].replace(/\[&.*?\]/g, ''); 
      return parseNewick(newickString);
    }
    throw new Error('Arquivo Nexus válido, mas não foi encontrada uma árvore no formato "TREE ... = (...);"');
  }
  
  if (content.startsWith('(') || content.includes(';')) {
      return parseNewick(content);
  }
  
  if (content.startsWith('>')) {
      throw new Error('Formato FASTA detectado. Por favor, carregue um arquivo de árvore (.nwk, .nexus).');
  }

  throw new Error('Formato de arquivo de árvore não reconhecido.');
};

/**
 * Analisa uma string no formato Newick e a converte em um objeto hierárquico.
 * @param {string} newick A string da árvore Newick.
 * @returns {object} O nó raiz da árvore.
 */
const parseNewick = (newick) => {
    let nextId = 0;
    const cleanNewick = newick.trim().replace(/;$/, '');

    const parseNode = (str, index = { value: 0 }) => {
        const node = { children: [], id: nextId++ };
        
        if (str[index.value] === '(') {
            index.value++;
            while (str[index.value] !== ')') {
                node.children.push(parseNode(str, index));
                if (str[index.value] === ',') {
                    index.value++;
                }
            }
            index.value++;
        }

        let name = '';
        while (index.value < str.length && !',):;'.includes(str[index.value])) {
            name += str[index.value];
            index.value++;
        }
        
        const nameAndLength = name.split(':');
        if (nameAndLength[0]) {
            node.name = nameAndLength[0].trim();
        }
        if (nameAndLength.length > 1) {
            node.length = parseFloat(nameAndLength[1]);
        }
        
        if (str[index.value] === ':') {
             index.value++;
            let lengthStr = '';
            while (index.value < str.length && !',);'.includes(str[index.value])) {
                lengthStr += str[index.value];
                index.value++;
            }
            if (lengthStr) {
                 node.length = parseFloat(lengthStr);
            }
        }

        if (!node.name) {
            node.name = `internal_${node.id}`;
        }

        return node;
    };
    return parseNode(cleanNewick);
};