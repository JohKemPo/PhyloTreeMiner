import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import {
  Button,
  Card,
  Space,
  Alert,
  Select,
  Descriptions,
  Spin,
  Empty,
  Typography,
} from "antd";
import {
  DownloadOutlined,
  CloseOutlined,
  SettingOutlined,
  FilterOutlined,
  GlobalOutlined,
  FieldTimeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const PhylogeneticTreeViewer = ({ data, onNodeClick, metadata = null }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [treeData, setTreeData] = useState(null);
  const [filteredTreeData, setFilteredTreeData] = useState(null);
  const [error, setError] = useState(null);
  const [colorBy, setColorBy] = useState(null);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [availableMetadataFields, setAvailableMetadataFields] = useState([]);
  const [nodeDetails, setNodeDetails] = useState(null);
  const [optionsCollapsed, setOptionsCollapsed] = useState(true);
  const [layoutType, setLayoutType] = useState("linear");
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [treeTooLarge, setTreeTooLarge] = useState(false);
  const navigate = useNavigate();
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (data && metadata) {
      const dataSize =
        typeof data === "string" ? data.length : JSON.stringify(data).length;
      if (dataSize > 2500) {
        setTreeTooLarge(true);
        return;
      }
    }
    setTreeTooLarge(false);
  }, [data, metadata]);

  const flattenMetadata = (obj, prefix = "") => {
    let result = [];

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        result = result.concat(flattenMetadata(item, `${prefix}[${idx}]`));
      });
    } else if (typeof obj === "object" && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "object" && value !== null) {
          result = result.concat(flattenMetadata(value, path));
        } else {
          result.push({ label: path, value });
        }
      });
    } else {
      result.push({ label: prefix, value: obj });
    }

    return result;
  };

  const processMetadata = useCallback(() => {
    if (!metadata || !Array.isArray(metadata) || metadata.length === 0) {
      setAvailableMetadataFields([]);
      setColorBy(null);
      return;
    }

    try {
      const allTerminals = findAllDataTerminals(metadata);

      const allFields = new Set();
      allTerminals.forEach((t) => {
        if (t.metadata) {
          const fields = extractMetadataFields(t.metadata);
          fields.forEach((f) => allFields.add(f));
        }
      });

      const fieldsArray = Array.from(allFields);
      setAvailableMetadataFields(fieldsArray);
      if (fieldsArray.length > 0) {
        setColorBy(fieldsArray[0]);
      }
    } catch (error) {
      console.error("Error processing metadata:", error);
      setAvailableMetadataFields([]);
      setColorBy(null);
    }
  }, [metadata]);

  useEffect(() => {
    if (!data) return;
    try {
      const parsedTree = universalTreeParser(data);
      setTreeData(parsedTree);
      setFilteredTreeData(parsedTree);
      setError(null);
      processMetadata();
    } catch (err) {
      setError("Erro ao analisar os dados da árvore: " + err.message);
    }
  }, [data, metadata, processMetadata]);

  function findAllDataTerminals(obj) {
    let results = [];

    if (typeof obj !== "object" || obj === null) return results;

    if ("data_terminals" in obj && Array.isArray(obj.data_terminals)) {
      results.push(...obj.data_terminals);
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        results = results.concat(findAllDataTerminals(item));
      }
    } else {
      for (const value of Object.values(obj)) {
        results = results.concat(findAllDataTerminals(value));
      }
    }

    return results;
  }

  const extractMetadataFields = (obj, prefix = "") => {
    let fields = [];

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        fields = fields.concat(
          extractMetadataFields(item, `${prefix}[${idx}]`)
        );
      });
    } else if (typeof obj === "object" && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "object" && value !== null) {
          fields = fields.concat(extractMetadataFields(value, path));
        } else {
          fields.push(path);
        }
      });
    } else {
      fields.push(prefix);
    }

    return fields;
  };

  const getMetadataValue = (nodeName, fieldPath) => {
    if (!metadata || !Array.isArray(metadata) || !nodeName) return null;

    try {
      const allTerminals = findAllDataTerminals(metadata);

      for (const terminal of allTerminals) {
        if (terminal.newick === nodeName && terminal.metadata) {
          const pathParts = fieldPath.replace(/\[(\d+)\]/g, ".$1").split(".");
          let value = terminal.metadata;

          for (const part of pathParts) {
            if (value && value[part] !== undefined) {
              value = value[part];
            } else {
              return null;
            }
          }

          return Array.isArray(value) ? value.join(", ") : value;
        }
      }
      return null;
    } catch (error) {
      console.error("Error getting metadata value:", error);
      return null;
    }
  };

  const universalTreeParser = (fileContent) => {
    const content = fileContent.trim();

    if (content.toUpperCase().startsWith("#NEXUS")) {
      const treeMatch = content.match(/tree\s+.*?=\s*(\(.*?;)/is);
      if (treeMatch && treeMatch[1]) {
        const newickString = treeMatch[1];
        return parseNewick(newickString);
      }
      throw new Error(
        'Arquivo Nexus válido, mas não foi encontrada uma árvore no formato "TREE ... = (...);"'
      );
    }

    if (content.startsWith("(") || content.includes(";")) {
      return parseNewick(content);
    }

    if (content.startsWith(">")) {
      throw new Error(
        "Formato FASTA detectado. Por favor, carregue um arquivo de árvore (.nwk, .nexus)."
      );
    }

    throw new Error("Formato de arquivo de árvore não reconhecido.");
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
    const fontSize = isLargeTree ? "10px" : "12px";
    const strokeWidth = isLargeTree ? 1 : 1.5;

    const autoLayoutType = isLargeTree ? "radial" : layoutType;

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

    root.each((node) => {
      node.y = node.depth;
    });

    layout(root);

    if (layoutType === "radial") {
      const maxY = d3.max(root.descendants(), (d) => d.y);
      if (maxY > 0) {
        root.each((d) => {
          d.y = (d.y / maxY) * radius;
        });
      }
    }

    let linkGenerator;

    if (layoutType === "radial") {
      linkGenerator = d3
        .linkRadial()
        .angle((d) => d.x)
        .radius((d) => d.y);
    } else {
      linkGenerator = d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x);
    }

    const link = g
      .selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", linkGenerator)
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-width", 1.5)
      .style("stroke", (d) => {
        if (colorBy && metadata) {
          const targetName = d.target.data.name;
          if (targetName) {
            const metadataValue = getMetadataValue(targetName, colorBy);
            if (metadataValue) {
              return getColorForValue(metadataValue);
            }
          }
        }
        return "#555";
      })
      .append("title")
      .text((d) => `Length: ${d.target.data.length || 0}`);

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
        if (metadata) {
          handleNodeClick(event, d);
        } else {
          event.stopPropagation();
          onNodeClick({
            name: d.data.name,
            depth: d.depth,
            children: d.children ? d.children.length : 0,
            data: d.data,
          });
        }
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

        if (colorBy && metadata && !d.children) {
          const metadataValue = getMetadataValue(d.data.name, colorBy);
          if (metadataValue) {
            return getColorForValue(metadataValue);
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
        // if (isLargeTree && nodeCount > 100) {
        //   return  d === hoveredNode ? "block" : "none";
        // }
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

    if (colorBy && metadata) {
      renderLegend(g, width, height);
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
      setIsRendering(false);
    };
  }, [filteredTreeData, colorBy, collapsedNodes, selectedNode, metadata]);

  const highlightPath = (node, active) => {
    const paths = getPathToRoot(node);

    d3.selectAll(".link")
      .style("stroke", (d) => {
        return active && paths.includes(d.target) ? "#1890ff" : "#555";
      })
      .style("stroke-width", (d) => {
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

        if (colorBy && metadata && !d.children) {
          const metadataValue = getMetadataValue(d.data.name, colorBy);
          if (metadataValue) {
            return getColorForValue(metadataValue);
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

  const renderLegend = (g, width, height) => {
    if (!colorBy || !metadata) return;

    const uniqueValues = new Set();
    if (treeData) {
      const findLeafNodes = (node) => {
        if (!node.children || node.children.length === 0) {
          const value = getMetadataValue(node.name, colorBy);
          if (value) uniqueValues.add(value);
        } else {
          node.children.forEach(findLeafNodes);
        }
      };
      findLeafNodes(treeData);
    }

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
          .text(d.length > 30 ? d.substring(0, 30) + "..." : d)
          .style("font-size", "10px");
      });
  };

  const applyFilters = useCallback(() => {
    if (!treeData) return;

    const filterNode = (node) => {
      if (!metadata || !node.name) return true;

      for (const [field, values] of Object.entries(filters)) {
        if (values.length > 0) {
          const nodeValue = getMetadataValue(node.name, field);
          if (!values.includes(nodeValue)) {
            return false;
          }
        }
      }

      if (searchTerm) {
        let matchesSearch = false;

        if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          matchesSearch = true;
        }

        if (metadata && availableMetadataFields.length > 0) {
          for (const field of availableMetadataFields) {
            const value = getMetadataValue(node.name, field);
            if (
              value &&
              value.toString().toLowerCase().includes(searchTerm.toLowerCase())
            ) {
              matchesSearch = true;
              break;
            }
          }
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
  }, [treeData, filters, searchTerm, metadata, availableMetadataFields]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const getUniqueValuesForField = (field) => {
    const values = new Set();
    if (treeData && metadata) {
      const findValues = (node) => {
        if (!node.children || node.children.length === 0) {
          const value = getMetadataValue(node.name, field);
          if (value) values.add(value);
        } else {
          node.children.forEach(findValues);
        }
      };
      findValues(treeData);
    }
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
          // zIndex: 1,
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
        {availableMetadataFields.slice(0, 4).map((field) => (
          <div key={field} style={{ marginBottom: "10px" }}>
            <strong>{field.split(".").pop()}:</strong>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder={`Filter by ${field}`}
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
          onClick={() => setFilters({})}
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

  const handleNodeClick = (event, d) => {
    event.stopPropagation();

    if (selectedNode === d.data.name) {
      setSelectedNode(null);
      setNodeDetails(null);
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

    let nodeMetadata = null;
    if (metadata && availableMetadataFields.length > 0) {
      nodeMetadata = {};
      availableMetadataFields.forEach((field) => {
        const value = getMetadataValue(d.data.name, field);
        if (value) {
          nodeMetadata[field] = value;
        }
      });
    }

    setNodeDetails({
      name: d.data.name,
      metadata: nodeMetadata,
    });

    if (onNodeClick && d.data.name) {
      onNodeClick({
        name: d.data.name,
        depth: d.depth,
        children: d.children ? d.children.length : 0,
        data: d.data,
        metadata: nodeMetadata,
      });
    }
  };

  const handleCloseDetails = () => {
    setNodeDetails(null);
    setSelectedNode(null);
  };

  const handleSvgClick = (event) => {
    if (event.target === svgRef.current) {
      setSelectedNode(null);
      setNodeDetails(null);
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
    return <Alert message="Erro" description={error} type="error" showIcon />;
  }

  if (treeTooLarge && metadata) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          padding: "20px",
        }}
      >
        <Empty
          description={
            <span>
              The tree is too large for iterative visualization. We apologize
              for the inconvenience. <br />
              We are developing support for large trees.
            </span>
          }
        >
          <Button type="primary" onClick={() => navigate("/analysis")}>
            Try the analysis tool
          </Button>
        </Empty>
      </div>
    );
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
                  { value: "radial", label: "Radial", disabled: true },
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

            {availableMetadataFields.length > 0 && (
              <>
                <div style={{ marginTop: 16 }}>
                  <strong>Color By:</strong>
                </div>
                <Select
                  showSearch
                  value={colorBy}
                  onChange={setColorBy}
                  style={{ width: "400px", marginTop: 8 }}
                  options={availableMetadataFields.map((field) => {
                    const parts = field.split(".");
                    const lastKey = parts[parts.length - 1];
                    const digit = lastKey.split("[")[1]?.split("]")[0]
                      ? lastKey.split("[")[1]?.split("]")[0]
                      : "";
                    return {
                      value: field,
                      label: lastKey.split("[")[0] + " " + digit,
                    };
                  })}
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
          <Button
            type="dashed"
            icon={<SettingOutlined />}
            onClick={() => setOptionsCollapsed(false)}
            size="small"
          >
            Settings
          </Button>
        )}
      </div>

      <div style={{ flex: 1 }} onClick={handleSvgClick}>
        <svg
          ref={svgRef}
          style={{ height: "100%", width: "100%", cursor: "pointer" }}
        />
      </div>

      {renderFiltersPanel()}

      {nodeDetails && metadata && (
        <div
          style={{
            width: 700,
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

          <h3 style={{ marginBottom: 8 }}>Node Details: {nodeDetails.name}</h3>
          {nodeDetails.metadata ? (
            <Descriptions bordered size="small" column={1}>
              {flattenMetadata(nodeDetails.metadata).map(({ label, value }) => (
                <Descriptions.Item key={label} label={label}>
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          ) : (
            <p>No metadata available for this node</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PhylogeneticTreeViewer;
