import { useEffect, useRef, useState, useCallback } from "react";
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

import InsightsPanelAntd from "./InsightsPanelAntd";
import { universalTreeParser, acessoBase } from "./Tree/newickParser";
import { filterTree } from "./Tree/treeFiltering";
import { useLocalMetadataIndex } from "./Tree/useLocalMetadataIndex";
import { useNcbiNodeLookup } from "./Tree/useNcbiNodeLookup";
import { useTreeCanvasRenderer } from "./Tree/useTreeCanvasRenderer";

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

  // Filograma vs. cladograma: só se sabe depois de tentar renderizar com o
  // comprimento de ramo real — ver `useTreeCanvasRenderer`.
  const [temComprimentoRamo, setTemComprimentoRamo] = useState(true);
  // Override manual: força espaçamento por profundidade mesmo com comprimento
  // real disponível — para quando um ramo muito longo esmaga o resto da árvore.
  const [normalizarDistancias, setNormalizarDistancias] = useState(false);

  // Detalhe do nó selecionado: o que já temos localmente, mais o que o NCBI
  // responde ao vivo — as duas metades da "linkagem" pedida.
  const [selectedNodeInfo, setSelectedNodeInfo] = useState(null);

  const { localIndex, getLocalMetadata } = useLocalMetadataIndex(projectName);
  const { ncbiInfo, ncbiLoading, lookup: lookupNcbi, reset: resetNcbi } =
    useNcbiNodeLookup();

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

  const applyFilters = useCallback(() => {
    if (!treeData) return;
    const filtered = filterTree(treeData, {
      filters,
      searchTerm,
      temMetadadoLocal: localIndex.size > 0,
      getLocalMetadata,
      camposDeBusca: LOCAL_METADATA_FIELDS,
    });
    setFilteredTreeData(filtered);
  }, [treeData, filters, searchTerm, localIndex, getLocalMetadata]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleNodeClick = (d) => {
    if (selectedNode === d.data.name) {
      setSelectedNode(null);
      setSelectedNodeInfo(null);
      resetNcbi();
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
    /** Um terminal de verdade tem nome de acesso; nó interno tem "InnerN". */
    const ehTerminal = !d.children && d.data.name && !d.data.name.startsWith("Inner");
    setSelectedNodeInfo({ name: d.data.name, local, isLeaf: ehTerminal });
    resetNcbi();

    // NCBI só faz sentido para um terminal com número de acesso de verdade —
    // "InnerN" é um nó interno sintético do próprio pipeline.
    if (projectName && ehTerminal) {
      lookupNcbi(acessoBase(d.data.name));
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

  const { isRendering } = useTreeCanvasRenderer({
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
    onNodeClick: handleNodeClick,
    onBranchLengthInfoChange: setTemComprimentoRamo,
  });

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

  const handleCloseDetails = () => {
    setSelectedNode(null);
    setSelectedNodeInfo(null);
    resetNcbi();
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
