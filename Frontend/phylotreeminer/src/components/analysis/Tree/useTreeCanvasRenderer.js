import { useEffect, useState } from "react";
import * as d3 from "d3";
import { countNodes } from "./newickParser";

/**
 * Hook que possui o efeito imperativo de desenho D3 de `PhylogeneticTreeViewer`
 * (F-10/Arq-C, M5) — mesmo código do componente original, só isolado: quem
 * chama só precisa dos refs de `<svg>`/container e do estado que afeta o
 * desenho; `hoveredNode` e `isRendering` passam a viver aqui dentro, porque
 * nada fora do desenho os lia.
 *
 * Preserva o que a M4.21 corrigiu: o cleanup do efeito desanexa o listener
 * de zoom (`svg.on(".zoom", null)`) antes de cada novo desenho e ao
 * desmontar — sem isto o listener se empilha a cada render (ver
 * `src/__tests__/zoomCleanup.test.jsx`).
 *
 * @param {object} params
 * @param {import('react').RefObject<SVGSVGElement>} params.svgRef
 * @param {import('react').RefObject<HTMLElement>} params.containerRef - elemento cujo `clientWidth/clientHeight` dimensiona o layout (o container inteiro, não só o `<svg>` — o painel de detalhes lateral também disputa essa largura).
 * @param {object|null} params.filteredTreeData
 * @param {'linear'|'radial'} params.layoutType
 * @param {string|null} params.colorBy
 * @param {Set<string>} params.collapsedNodes
 * @param {string|null} params.selectedNode
 * @param {Map<string,object>} params.localIndex
 * @param {(nodeName: string) => object|null} params.getLocalMetadata
 * @param {boolean} params.normalizarDistancias
 * @param {(node: import('d3-hierarchy').HierarchyNode) => void} params.onNodeClick
 * @param {(temComprimentoRamo: boolean) => void} params.onBranchLengthInfoChange
 * @returns {{isRendering: boolean}}
 */
export function useTreeCanvasRenderer({
  svgRef,
  containerRef,
  filteredTreeData,
  layoutType,
  colorBy,
  collapsedNodes,
  selectedNode,
  localIndex,
  getLocalMetadata,
  normalizarDistancias,
  onNodeClick,
  onBranchLengthInfoChange,
}) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (!filteredTreeData || !svgRef.current) {
      setIsRendering(false);
      return undefined;
    }
    renderTree();

    // Capturado aqui (não lido de `svgRef.current` dentro do cleanup): o
    // ref pode já apontar para outro nó quando o cleanup rodar.
    const svgAtual = svgRef.current;
    return () => {
      // `svg.selectAll("*").remove()` no próximo render limpa os filhos, mas
      // o listener de zoom fica anexado ao próprio <svg>, que sobrevive entre
      // renders — sem isto, cada execução deste efeito empilha mais um
      // listener no mesmo elemento (M4.21).
      if (svgAtual) {
        d3.select(svgAtual).on(".zoom", null);
      }
      setIsRendering(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTreeData, colorBy, collapsedNodes, selectedNode, layoutType, localIndex, normalizarDistancias]);

  const colorMap = new Map();

  function getColorForValue(value) {
    if (!value) return "#ccc";
    if (colorMap.has(value)) return colorMap.get(value);

    const totalColors = 20;
    const hueStep = 360 / totalColors;

    let hash = 0;
    const str = String(value);
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % totalColors;

    const usedIndices = [...colorMap.values()].map((c) => c.index);
    let hueIndex = index;
    while (usedIndices.includes(hueIndex)) {
      hueIndex = (hueIndex + 1) % totalColors;
    }

    const hue = hueIndex * hueStep;
    const sat = 60 + (hash % 20); // 60–80% saturação
    const light = 45 + (hash % 15); // 45–60% lightness
    const color = `hsl(${hue}, ${sat}%, ${light}%)`;

    colorMap.set(value, color);
    return color;
  }

  function getPathToRoot(node) {
    const path = [];
    let current = node;
    while (current) {
      path.push(current);
      current = current.parent;
    }
    return path;
  }

  function isNodeInPath(node, targetNode) {
    if (!node || !targetNode) return false;
    if (node === targetNode) return true;
    return isNodeInPath(node, targetNode.parent);
  }

  function highlightPath(node, active) {
    const paths = getPathToRoot(node);

    d3.selectAll(".link").style("stroke-width", (d) => {
      return active && paths.includes(d.target) ? 2.5 : 1.5;
    });

    d3.selectAll(".node circle")
      .attr("r", (d) => {
        if (active && paths.includes(d)) return 6;
        if (d.children && !collapsedNodes.has(d.data.name)) return 6;
        if (selectedNode === d.data.name) return 8;
        return 4;
      })
      .style("fill", (d) => {
        if (selectedNode === d.data.name) return "#ff4d4f";
        if (active && paths.includes(d)) return "#1890ff";
        if (d.children && !collapsedNodes.has(d.data.name)) return "#1890ff";

        if (colorBy && localIndex.size > 0 && !d.children) {
          const info = getLocalMetadata(d.data.name);
          if (info && info[colorBy]) {
            return getColorForValue(info[colorBy]);
          }
        }
        return "#52c41a";
      });
  }

  function renderLegend(g, width) {
    if (!colorBy || localIndex.size === 0) return;

    const uniqueValues = new Set();
    localIndex.forEach((info) => {
      if (info[colorBy]) uniqueValues.add(info[colorBy]);
    });

    const legendValues = Array.from(uniqueValues).slice(0, 100);

    const legend = g
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width + 20}, 20)`);

    legend
      .append("text")
      .attr("class", "legend-title")
      .attr("y", -10)
      .text(`Color by: ${colorBy}`)
      .style("font-weight", "bold")
      .style("font-size", "12px");

    legend
      .selectAll(".legend-item")
      .data(legendValues)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`)
      .each(function (d) {
        d3.select(this)
          .append("rect")
          .attr("width", 15)
          .attr("height", 15)
          .attr("fill", getColorForValue(d));

        d3.select(this)
          .append("text")
          .attr("x", 20)
          .attr("y", 12)
          .text(String(d).length > 30 ? String(d).substring(0, 30) + "..." : d)
          .style("font-size", "10px");
      });
  }

  function renderTree() {
    setIsRendering(true);
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!filteredTreeData) {
      setIsRendering(true);
      return;
    }
    if (!filteredTreeData.children || filteredTreeData.children.length === 0) {
      return;
    }

    const { clientWidth, clientHeight } = containerRef.current;
    const margin = { top: 50, right: 300, bottom: 50, left: 50 };
    let width = clientWidth - margin.left - margin.right;
    let height = clientHeight - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    const nodeCount = countNodes(filteredTreeData);
    const isLargeTree = nodeCount > 100;

    if (isLargeTree) {
      height *= 6;
      width *= 6;
    }

    const baseRadius = isLargeTree ? 3 : 6;
    const strokeWidth = isLargeTree ? 1 : 1.5;

    const g = svg.append("g");

    let layout;
    if (layoutType === "radial") {
      g.attr(
        "transform",
        `translate(${width / 2 + margin.left}, ${height / 2 + margin.top})`
      );
      layout = d3.cluster().size([2 * Math.PI, radius]);
    } else {
      g.attr("transform", `translate(${margin.left}, ${margin.top})`);
      layout = d3.tree().size([height, width]);
    }

    const root = d3.hierarchy(filteredTreeData);

    // `layout(root)` decide a ordem lateral dos nós (`d.x`); o eixo principal
    // (`d.y`) que ele calcula é por profundidade — um cladograma. Substituído
    // logo abaixo pela distância acumulada de ramo, quando ela existe.
    layout(root);

    root.each((d) => {
      d.lenAcumulado =
        (d.parent ? d.parent.lenAcumulado : 0) + (d.data.length || 0);
    });
    const maxLen = d3.max(root.descendants(), (d) => d.lenAcumulado) || 0;
    const comCompimento = maxLen > 0;
    const escala = layoutType === "radial" ? radius : width;
    // O usuário pode normalizar mesmo quando o arquivo tem comprimento real —
    // um ramo muito mais longo que os outros comprime o resto da árvore numa
    // faixa ilegível. Normalizar troca para espaçamento por profundidade,
    // igual ao cladograma, sem fingir que o arquivo não tem a distância.
    const usarComprimentoReal = comCompimento && !normalizarDistancias;

    if (usarComprimentoReal) {
      // Filograma: a posição no eixo principal é a distância evolutiva real
      // desde a raiz, não a contagem de arestas. Era isto que faltava — o
      // `d3.tree()`/`d3.cluster()` originais só sabem desenhar cladograma.
      root.each((d) => {
        d.y = (d.lenAcumulado / maxLen) * escala;
      });
    } else if (layoutType === "radial") {
      // Newick sem comprimento de ramo declarado: não há o que respeitar.
      // Mantém cladograma por profundidade, só reescalado para o raio —
      // era o único caso que o código anterior tratava.
      const maxDepth = d3.max(root.descendants(), (d) => d.depth) || 1;
      root.each((d) => {
        d.y = (d.depth / maxDepth) * escala;
      });
    }
    onBranchLengthInfoChange(comCompimento);

    // Ramos em ângulo reto, não curva suave — como Bio.Phylo.draw(): o
    // comprimento do ramo é uma distância, uma bezier entre pai e filho
    // sugere uma transição gradual que não existe na biologia.
    let linkGenerator;

    if (layoutType === "radial") {
      linkGenerator = (d) => {
        const { source, target } = d;
        const [sx, sy] = d3.pointRadial(source.x, source.y);
        const [ax, ay] = d3.pointRadial(target.x, source.y);
        const [tx, ty] = d3.pointRadial(target.x, target.y);
        const largeArc = Math.abs(target.x - source.x) > Math.PI ? 1 : 0;
        const sweep = target.x > source.x ? 1 : 0;
        // arco de raio constante (mesma distância do pai) até o ângulo do
        // filho, depois uma reta radial até ele — sem curva, só ângulo reto.
        return `M${sx},${sy}A${source.y},${source.y} 0 ${largeArc} ${sweep} ${ax},${ay}L${tx},${ty}`;
      };
    } else {
      linkGenerator = (d) => {
        const { source, target } = d;
        return `M${source.y},${source.x}V${target.x}H${target.y}`;
      };
    }

    g
      .selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", linkGenerator)
      .attr("fill", "none")
      .attr("stroke-width", strokeWidth)
      .style("stroke", (d) => {
        if (colorBy && localIndex.size > 0) {
          const targetName = d.target.data.name;
          if (targetName) {
            const info = getLocalMetadata(targetName);
            if (info && info[colorBy]) {
              return getColorForValue(info[colorBy]);
            }
          }
        }
        return "#555";
      })
      .append("title")
      .text((d) => `Comprimento do ramo: ${d.target.data.length ?? "—"}`);

    const node = g
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => {
        if (layoutType === "radial") {
          return `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`;
        } else {
          return `translate(${d.y},${d.x})`;
        }
      })
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      })
      .on("mouseover", (event, d) => {
        setHoveredNode(d);
        highlightPath(d, true);
      })
      .on("mouseout", (event, d) => {
        setHoveredNode(null);
        highlightPath(d, false);
      });

    const shouldRenderDetail = (d, isLargeTreeArg) => {
      if (!isLargeTreeArg) return true;

      if (hoveredNode && isNodeInPath(d, hoveredNode)) return true;
      if (selectedNode === d.data.name) return true;
      if (d.depth <= 1) return true;

      return false;
    };

    node
      .append("circle")
      .attr("r", (d) => {
        if (!shouldRenderDetail(d, isLargeTree)) return baseRadius - 1;
        if (d.children && !collapsedNodes.has(d.data.name))
          return baseRadius + 2;
        if (selectedNode === d.data.name) return baseRadius + 4;
        if (hoveredNode && isNodeInPath(d, hoveredNode)) return baseRadius + 2;
        return baseRadius;
      })
      .attr("fill", (d) => {
        if (selectedNode === d.data.name) return "#ff4d4f";
        if (hoveredNode && isNodeInPath(d, hoveredNode)) return "#1890ff";
        if (d.children && !collapsedNodes.has(d.data.name)) return "#1890ff";

        if (colorBy && localIndex.size > 0 && !d.children) {
          const info = getLocalMetadata(d.data.name);
          if (info && info[colorBy]) {
            return getColorForValue(info[colorBy]);
          }
        }
        return "#52c41a";
      })
      .attr("stroke", (d) =>
        selectedNode === d.data.name ||
        (hoveredNode && isNodeInPath(d, hoveredNode))
          ? "#ff4d4f"
          : "#fff"
      )
      .attr("stroke-width", (d) =>
        selectedNode === d.data.name ||
        (hoveredNode && isNodeInPath(d, hoveredNode))
          ? 2
          : 1
      );

    node
      .append("text")
      .attr("dy", "0.31em")
      .attr("x", (d) => {
        if (layoutType === "radial") {
          return d.x < Math.PI === !d.children ? 8 : -8;
        } else {
          return d.children ? -10 : 10;
        }
      })
      .style("text-anchor", (d) => {
        if (layoutType === "radial") {
          return d.x < Math.PI === !d.children ? "start" : "end";
        } else {
          return d.children ? "end" : "start";
        }
      })
      .attr("transform", (d) => {
        if (layoutType === "radial") {
          return d.x >= Math.PI ? "rotate(180)" : null;
        }
        return null;
      })
      .style("font-size", "12px")
      .style("display", (d) => {
        if (d.parent && collapsedNodes.has(d.parent.data.name)) return "none";
        if (d.children && d.data.name && d.data.name.startsWith("Inner"))
          return "none";
        return "block";
      })
      .text((d) => d.data.name);

    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);

    if (colorBy && localIndex.size > 0) {
      renderLegend(g, width);
    }
    setIsRendering(false);
  }

  return { isRendering };
}
