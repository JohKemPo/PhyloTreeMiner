import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import {
  Button,
  Card,
  Space,
  Alert,
  Select,
  Input,
  Descriptions,
  Spin,
  Typography,
  Tag,
  Tooltip,
} from "antd";
import {
  DownloadOutlined,
  CloseOutlined,
  SettingOutlined,
  FilterOutlined,
  GlobalOutlined,
  FieldTimeOutlined,
  InfoCircleOutlined,
  ExportOutlined,
  ColumnWidthOutlined,
} from "@ant-design/icons";

import { API_BASE_URL, fetchNcbiInfo } from "../../services/dataServices";
import InsightsPanelAntd from "./InsightsPanelAntd";

/**
 * Campos leves do dataset local disponíveis para cor/filtro/detalhe — o
 * mesmo shape que `/api/tree/{projeto}/search-nodes` já devolve (host,
 * country, region, lineage, year, isolate). Não é a lista dinâmica de
 * "todo campo aninhado do metadata.json": esse era o formato antigo, e
 * exigia carregar o arquivo inteiro no navegador para colorir a árvore.
 */
const LOCAL_METADATA_FIELDS = [
  { field: "host", label: "Host" },
  { field: "country", label: "Country" },
  { field: "region", label: "Region" },
  { field: "lineage", label: "Lineage" },
  { field: "year", label: "Collection Date" },
];

/** Mesma normalização do backend (`accession_base`): sem a versão do acesso. */
const acessoBase = (rotulo) => (rotulo ? rotulo.split(".")[0] : rotulo);

const PhylogeneticTreeViewer = ({
  data,
  onNodeClick,
  projectName = null,
}) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [treeData, setTreeData] = useState(null);
  const [filteredTreeData, setFilteredTreeData] = useState(null);
  const [error, setError] = useState(null);
  const [colorBy, setColorBy] = useState(null);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [optionsCollapsed, setOptionsCollapsed] = useState(true);
  const [layoutType, setLayoutType] = useState("linear");
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [isRendering, setIsRendering] = useState(false);

  // Filograma vs. cladograma: só se sabe depois de tentar renderizar com o
  // comprimento de ramo real — ver `renderTree`.
  const [temComprimentoRamo, setTemComprimentoRamo] = useState(true);
  // Override manual: força espaçamento por profundidade mesmo com comprimento
  // real disponível — para quando um ramo muito longo esmaga o resto da árvore.
  const [normalizarDistancias, setNormalizarDistancias] = useState(false);

  // Índice leve de metadado do projeto — `accessionId -> {host,country,...}`.
  // Substitui o `metadata.json` inteiro que a versão anterior recebia como
  // prop: aqui é uma linha por acesso, não a árvore de features/qualifiers.
  const [localIndex, setLocalIndex] = useState(new Map());

  // Detalhe do nó selecionado: o que já temos localmente, mais o que o NCBI
  // responde ao vivo — as duas metades da "linkagem" pedida.
  const [selectedNodeInfo, setSelectedNodeInfo] = useState(null);
  const [ncbiInfo, setNcbiInfo] = useState(null);
  const [ncbiLoading, setNcbiLoading] = useState(false);

  useEffect(() => {
    if (!projectName) {
      setLocalIndex(new Map());
      return;
    }
    let cancelado = false;
    fetch(`${API_BASE_URL}/api/tree/${projectName}/search-nodes`)
      .then((r) => (r.ok ? r.json() : []))
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

  useEffect(() => {
    if (!data) return;
    try {
      const parsedTree = universalTreeParser(data);
      setTreeData(parsedTree);
      setFilteredTreeData(parsedTree);
      setError(null);
    } catch (err) {
      setError("Failed to parse tree data: " + err.message);
    }
  }, [data]);

  const universalTreeParser = (fileContent) => {
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
  };

  const parseNewick = (newick) => {
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
  };

  const countNodes = (treeData) => {
    let count = 0;
    const countRecursive = (node) => {
      count++;
      if (node.children) {
        node.children.forEach(countRecursive);
      }
    };
    countRecursive(treeData);
    return count;
  };

  const renderTree = () => {
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
    setTemComprimentoRamo(comCompimento);

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
        handleNodeClick(d);
      })
      .on("mouseover", (event, d) => {
        setHoveredNode(d);
        highlightPath(d, true);
      })
      .on("mouseout", (event, d) => {
        setHoveredNode(null);
        highlightPath(d, false);
      });

    const shouldRenderDetail = (d, isLargeTree) => {
      if (!isLargeTree) return true;

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
  };

  useEffect(() => {
    if (!filteredTreeData || !svgRef.current) {
      setIsRendering(false);
      return;
    }
    renderTree();

    return () => {
      // `svg.selectAll("*").remove()` no próximo render limpa os filhos, mas
      // o listener de zoom fica anexado ao próprio <svg>, que sobrevive entre
      // renders — sem isto, cada execução deste efeito empilha mais um
      // listener no mesmo elemento (M4.21).
      if (svgRef.current) {
        d3.select(svgRef.current).on(".zoom", null);
      }
      setIsRendering(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTreeData, colorBy, collapsedNodes, selectedNode, layoutType, localIndex, normalizarDistancias]);

  const highlightPath = (node, active) => {
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
  };

  const getPathToRoot = (node) => {
    const path = [];
    let current = node;
    while (current) {
      path.push(current);
      current = current.parent;
    }
    return path;
  };

  const isNodeInPath = (node, targetNode) => {
    if (!node || !targetNode) return false;
    if (node === targetNode) return true;
    return isNodeInPath(node, targetNode.parent);
  };

  const renderLegend = (g, width) => {
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
  };

  const applyFilters = useCallback(() => {
    if (!treeData) return;

    const filterNode = (node) => {
      if (localIndex.size === 0 || !node.name) return true;

      const info = getLocalMetadata(node.name);

      for (const [field, values] of Object.entries(filters)) {
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
          matchesSearch = LOCAL_METADATA_FIELDS.some(({ field }) =>
            String(info[field] ?? "").toLowerCase().includes(alvo),
          );
        }

        if (!matchesSearch) return false;
      }

      return true;
    };

    const filterTree = (node) => {
      const newNode = { ...node };

      if (newNode.children) {
        newNode.children = newNode.children
          .map(filterTree)
          .filter((child) => child !== null);

        if (newNode.children.length > 0 || filterNode(newNode)) {
          return newNode;
        }
      }

      return filterNode(newNode) ? newNode : null;
    };

    const filtered = filterTree(treeData);
    setFilteredTreeData(filtered);
  }, [treeData, filters, searchTerm, localIndex, getLocalMetadata]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const getUniqueValuesForField = (field) => {
    const values = new Set();
    localIndex.forEach((info) => {
      if (info[field]) values.add(info[field]);
    });
    return Array.from(values);
  };

  const renderFiltersPanel = () => {
    if (!showFilters) return null;

    return (
      <Card
        size="small"
        title="Dynamic Filters"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: "300px",
        }}
        extra={
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setShowFilters(false)}
            size="small"
          />
        }
      >
        <div style={{ marginBottom: "10px" }}>
          <strong>Search:</strong>
          <Input.Search
            allowClear
            placeholder="Terminal name or metadata"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </div>

        {LOCAL_METADATA_FIELDS.map(({ field, label }) => (
          <div key={field} style={{ marginBottom: "10px" }}>
            <strong>{label}:</strong>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder={`Filter by ${label}`}
              value={filters[field] || []}
              onChange={(values) =>
                setFilters((prev) => ({
                  ...prev,
                  [field]: values,
                }))
              }
              options={getUniqueValuesForField(field).map((value) => ({
                value,
                label: value,
              }))}
            />
          </div>
        ))}

        <Button
          onClick={() => {
            setFilters({});
            setSearchTerm("");
          }}
          style={{ width: "100%", marginTop: "10px" }}
        >
          Reset Filters
        </Button>
      </Card>
    );
  };

  const colorMap = new Map();

  const getColorForValue = (value) => {
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
  };

  /** Um terminal de verdade tem nome de acesso; nó interno tem "InnerN". */
  const isAccessionLeaf = (d) =>
    !d.children && d.data.name && !d.data.name.startsWith("Inner");

  const handleNodeClick = (d) => {
    if (selectedNode === d.data.name) {
      setSelectedNode(null);
      setSelectedNodeInfo(null);
      setNcbiInfo(null);
      return;
    }

    if (d.children) {
      const newCollapsedNodes = new Set(collapsedNodes);
      if (newCollapsedNodes.has(d.data.name)) {
        newCollapsedNodes.delete(d.data.name);
      } else {
        newCollapsedNodes.add(d.data.name);
      }
      setCollapsedNodes(newCollapsedNodes);
    }

    setSelectedNode(d.data.name);

    const local = getLocalMetadata(d.data.name);
    const ehTerminal = isAccessionLeaf(d);
    setSelectedNodeInfo({ name: d.data.name, local, isLeaf: ehTerminal });
    setNcbiInfo(null);

    // NCBI só faz sentido para um terminal com número de acesso de verdade —
    // "InnerN" é um nó interno sintético do próprio pipeline.
    if (projectName && ehTerminal) {
      setNcbiLoading(true);
      fetchNcbiInfo(acessoBase(d.data.name))
        .then((info) => setNcbiInfo(info))
        .catch(() => setNcbiInfo(null))
        .finally(() => setNcbiLoading(false));
    }

    if (onNodeClick) {
      onNodeClick({
        name: d.data.name,
        depth: d.depth,
        children: d.children ? d.children.length : 0,
        data: d.data,
        metadata: local,
      });
    }
  };

  const handleCloseDetails = () => {
    setSelectedNode(null);
    setSelectedNodeInfo(null);
    setNcbiInfo(null);
  };

  const handleSvgClick = (event) => {
    if (event.target === svgRef.current) {
      handleCloseDetails();
    }
  };

  const exportTree = () => {
    const svgElement = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "phylogenetic_tree.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
      }}
    >
      {isRendering && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            background: "rgba(255, 255, 255, 0.8)",
            padding: "20px",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Spin size="large" />
          <Typography.Text>Rendering tree...</Typography.Text>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1,
          transition: "all 0.3s ease",
        }}
      >
        {!optionsCollapsed ? (
          <Card
            size="small"
            title="Options"
            extra={
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setOptionsCollapsed(true)}
                size="small"
              />
            }
          >
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <strong>Layout Type:</strong>
              <Select
                value={layoutType}
                onChange={setLayoutType}
                style={{ width: "100%", marginTop: 8 }}
                options={[
                  { value: "linear", label: "Linear" },
                  { value: "radial", label: "Radial" },
                ]}
              />
            </div>
            <Space direction="horizontal">
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
                style={{ margin: 4 }}
              >
                Filters
              </Button>

              <Button
                icon={<FieldTimeOutlined />}
                onClick={() => setShowTimeline(!showTimeline)}
                style={{ margin: 4 }}
                disabled
              >
                Timeline Event
              </Button>

              <Button
                icon={<GlobalOutlined />}
                onClick={() => setShowMap(!showMap)}
                style={{ margin: 4 }}
                disabled
              >
                Geo Map
              </Button>
            </Space>

            {localIndex.size > 0 && (
              <>
                <div style={{ marginTop: 16 }}>
                  <strong>Color By:</strong>
                </div>
                <Select
                  allowClear
                  showSearch
                  value={colorBy}
                  onChange={setColorBy}
                  style={{ width: "100%", marginTop: 8 }}
                  options={LOCAL_METADATA_FIELDS.map(({ field, label }) => ({
                    value: field,
                    label,
                  }))}
                />
              </>
            )}

            <div style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={exportTree}
                  style={{ width: "100%" }}
                >
                  Download SVG
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={exportTree}
                  style={{ width: "100%" }}
                  disabled
                >
                  Download JPG
                </Button>
              </Space>
            </div>
          </Card>
        ) : (
          <Space>
            <Button
              type="dashed"
              icon={<SettingOutlined />}
              onClick={() => setOptionsCollapsed(false)}
              size="small"
            >
              Settings
            </Button>
            <Tooltip
              title={
                !temComprimentoRamo
                  ? "This file has no branch length — showing topology only."
                  : normalizarDistancias
                    ? "Equal spacing by depth — branch length ignored for readability. The real length is unchanged in the file."
                    : "Node position proportional to accumulated evolutionary distance (branch length from the file)."
              }
            >
              <Tag
                icon={<InfoCircleOutlined />}
                color={
                  !temComprimentoRamo
                    ? "default"
                    : normalizarDistancias
                      ? "gold"
                      : "blue"
                }
              >
                {!temComprimentoRamo
                  ? "Cladogram"
                  : normalizarDistancias
                    ? "Normalized"
                    : "Phylogram"}
              </Tag>
            </Tooltip>
            {temComprimentoRamo && (
              <Tooltip
                title={
                  normalizarDistancias
                    ? "Show real branch length again"
                    : "Normalize branch lengths for easier reading (equal spacing by depth)"
                }
              >
                <Button
                  size="small"
                  type={normalizarDistancias ? "primary" : "default"}
                  icon={<ColumnWidthOutlined />}
                  onClick={() => setNormalizarDistancias((v) => !v)}
                >
                  Normalize
                </Button>
              </Tooltip>
            )}
          </Space>
        )}
      </div>

      <div style={{ flex: 1 }} onClick={handleSvgClick}>
        <svg
          ref={svgRef}
          style={{ height: "100%", width: "100%", cursor: "pointer" }}
        />
      </div>

      {renderFiltersPanel()}

      {selectedNodeInfo && (
        <div
          style={{
            width: 380,
            padding: 20,
            background: "#f9f9f9",
            borderLeft: "1px solid #ddd",
            overflowY: "auto",
            position: "relative",
          }}
        >
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={handleCloseDetails}
            style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}
          />

          <h3 style={{ marginBottom: 8 }}>Node: {selectedNodeInfo.name}</h3>

          {selectedNodeInfo.local ? (
            <Descriptions
              title="Dataset"
              bordered
              size="small"
              column={1}
              style={{ marginBottom: 16 }}
            >
              {LOCAL_METADATA_FIELDS.map(({ field, label }) => (
                <Descriptions.Item key={field} label={label}>
                  {selectedNodeInfo.local[field] ?? "—"}
                </Descriptions.Item>
              ))}
            </Descriptions>
          ) : (
            projectName && (
              <Alert
                type="info"
                showIcon
                message="No local metadata for this node"
                description="No matching record in search-nodes — common for internal nodes (InnerN) or accessions missing from the metadata."
                style={{ marginBottom: 16 }}
              />
            )
          )}

          {projectName && selectedNodeInfo.isLeaf ? (
            <InsightsPanelAntd
              selectedNode={{ name: selectedNodeInfo.name }}
              insights={ncbiInfo}
              isLoading={ncbiLoading}
            />
          ) : (
            projectName && (
              <Alert
                type="default"
                showIcon
                icon={<ExportOutlined />}
                message="Internal node"
                description={`"${selectedNodeInfo.name}" is a synthetic clade from the pipeline, not a GenBank accession — nothing to look up on NCBI.`}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default PhylogeneticTreeViewer;
