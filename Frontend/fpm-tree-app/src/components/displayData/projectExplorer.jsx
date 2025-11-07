import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Select,
  List,
  Typography,
  Breadcrumb,
  Alert,
  Space,
  Modal,
  Spin,
  Card,
  Empty,
  Button,
  Tag,
  message,
} from "antd";
import CompareIcon from "@mui/icons-material/Compare";
import {
  FolderOutlined,
  FileOutlined,
  HomeOutlined,
  BarChartOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import MSAViewer from "../../components/analysis/MSAViewer";
import PhylogeneticTreeViewer from "../../components/analysis/PhylogeneticTreeViewer";
import TableView from "../../components/common/TableView";
import TreeComparisonViewer from "../analysis/TreeComparisonViewer";
import TreePatternAnalysis from "../analysis/TreePatternAnalysis";
import CQLExecutor from "../CQLExecutor";
import PhylogeneticInsights from "../analysis/Tree/PhylogeneticInsights";

const { Option } = Select;

const ProjectExplorer = ({ initialProjectName = null }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(initialProjectName);
  const [currentPath, setCurrentPath] = useState(initialProjectName || "");

  const [directoryContent, setDirectoryContent] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [modalContentType, setModalContentType] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const [loadingItemPath, setLoadingItemPath] = useState(null);
  const [loadingItems, setLoadingItems] = useState(new Set());

  const [selectedItems, setSelectedItems] = useState([]);
  const [comparisonMode, setComparisonMode] = useState(false);

  const [metadata, setMetadata] = useState(null);
  const [dadosOWID, setDadosOWID] = useState(null);
  const [isComparisonAllowed, setIsComparisonAllowed] = useState(false);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const [showInfoAlert, setShowInfoAlert] = useState(true);

  const API_BASE_URL = "http://localhost:8000";
  const directoryContentRef = useRef([]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (initialProjectName) return;

      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/projects`);
        if (!response.ok) throw new Error("Falha ao buscar projetos.");
        const data = await response.json();
        setProjects(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
    fetchMetadata(initialProjectName);
  }, [initialProjectName]);

  useEffect(() => {
    if (metadata && Object.keys(metadata).length > 0) {
      fetchOWIDMetadata(metadata);
    }
  }, [metadata]);

  const fetchDirectoryContent = useCallback(async (path) => {
    if (directoryContentRef.current.path === path) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/browse?path=${encodeURIComponent(path)}`
      );
      if (!response.ok) throw new Error("Failed to fetch content.");

      const data = await response.json();
      directoryContentRef.current = { path, data };
      setDirectoryContent(data);
    } catch (err) {
      setError(err.message);
      setDirectoryContent([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMetadata = useCallback(async (projectName) => {
    if (!projectName) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tree/metadata/${projectName}`
      );
      if (!response.ok) throw new Error("Failed to fetch metadata.");

      const data = await response.json();
      setMetadata(data);
    } catch (err) {
      setError(err.message);
      setMetadata({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOWIDMetadata = useCallback(async (metadata) => {
    if (!metadata || Object.keys(metadata).length === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      let payload = metadata;

      if (typeof metadata === "string") {
        try {
          payload = JSON.parse(metadata);
        } catch (parseError) {
          console.error("Error parsing metadata.:", parseError);
          throw new Error("Invalid metadata format.");
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/owid/metadata/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to fetch metadata.");

      const data = await response.json();
      setDadosOWID(data);
    } catch (err) {
      setError(err.message);
      setDadosOWID({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const isInTreesFolder =
      currentPath.includes("/Trees") || currentPath.endsWith("Trees");
    setIsComparisonAllowed(isInTreesFolder);

    if (selectedProject) {
      fetchDirectoryContent(currentPath);
    } else {
      setDirectoryContent([]);
    }
  }, [currentPath, selectedProject, fetchDirectoryContent]);

  const handleProjectSelect = (projectName) => {
    setSelectedProject(projectName);
    setCurrentPath(projectName || "");
  };

  const handleBreadcrumbClick = (pathToGo) => {
    setCurrentPath(pathToGo);
  };

  const handleCloseModal = () => {
    setShowAnalysis(false);

    setIsModalVisible(false);
    setModalItem(null);

    if (loadingItemPath) {
      message.destroy(loadingItemPath);
      setLoadingItemPath(null);
    }
    loadingItems.forEach((path) => message.destroy(path));
    setLoadingItems(new Set());
  };

  const isItemLoading = (itemPath) => {
    return loadingItems.has(itemPath);
  };

  const handleItemClick = async (item) => {
    if (comparisonMode) {
      if (item.type === "directory" || !isTreeFile(item)) return;

      const isSelected = selectedItems.some(
        (selected) => selected.path === item.path
      );

      if (isSelected) {
        setSelectedItems(
          selectedItems.filter((selected) => selected.path !== item.path)
        );
      } else {
        if (selectedItems.length < 2) {
          setSelectedItems([...selectedItems, item]);
        } else {
          setSelectedItems([selectedItems[1], item]);
        }
      }
      return;
    }

    if (item.type === "directory") {
      setCurrentPath(item.path);
      return;
    }

    setLoadingItemPath(item.path);
    setLoadingItems((prev) => new Set(prev).add(item.path));

    message.loading({
      content: `Loading ${item.name}...`,
      key: item.path,
      duration: 0,
    });

    setModalItem(item);
    setIsModalVisible(true);
    setIsModalLoading(true);
    setModalContent(null);
    setModalContentType(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/file?path=${encodeURIComponent(item.path)}`
      );
      if (!response.ok)
        throw new Error(`Erro ${response.status}: ${response.statusText}`);

      if (response.headers.get("content-type")?.startsWith("image/")) {
        const blob = await response.blob();
        setModalContent(URL.createObjectURL(blob));
        setModalContentType("image");
      } else {
        const data = await response.json();
        setModalContent(data.content);
        setModalContentType(data.type);
      }

      message.success({
        content: `${item.name} loaded successfully!`,
        key: item.path,
        duration: 2,
      });
    } catch (error) {
      console.error("Falha ao carregar conteúdo do arquivo:", error);
      setModalContent(null);
      setModalContentType("error");

      message.error({
        content: `Failed to load ${item.name}`,
        key: item.path,
        duration: 3,
      });
    } finally {
      setIsModalLoading(false);
      setLoadingItemPath(null);
      setLoadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.path);
        return newSet;
      });
    }
  };

  const toggleComparisonMode = () => {
    setComparisonMode(!comparisonMode);
    setSelectedItems([]);
  };

  const togglePatternAnalysis = () => {
    setShowAnalysis(!showAnalysis);
    setIsModalVisible(true);
    setModalContentType("patternAnalysis");
    setIsModalLoading(false);
  };

  const handleCompareSelected = async () => {
    if (selectedItems.length !== 2) return;

    setModalItem(null);
    setIsModalVisible(true);
    setIsComparisonLoading(true);
    setModalContent(null);
    setModalContentType("comparison");

    try {
      const [tree1Response, tree2Response] = await Promise.all([
        fetch(
          `${API_BASE_URL}/file?path=${encodeURIComponent(
            selectedItems[0].path
          )}`
        ),
        fetch(
          `${API_BASE_URL}/file?path=${encodeURIComponent(
            selectedItems[1].path
          )}`
        ),
      ]);

      if (!tree1Response.ok || !tree2Response.ok) {
        throw new Error("Failed to load trees for comparison");
      }

      const [tree1Data, tree2Data] = await Promise.all([
        tree1Response.json(),
        tree2Response.json(),
      ]);

      const initialContent = {
        tree1: tree1Data.content,
        tree2: tree2Data.content,
        tree1Name: selectedItems[0].name,
        tree2Name: selectedItems[1].name,
        comparisonData: null,
      };

      setModalContent(initialContent);

      const compareResponse = await fetch(`${API_BASE_URL}/api/tree/compare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tree1: tree1Data.content,
          tree2: tree2Data.content,
        }),
      });

      if (!compareResponse.ok) {
        throw new Error("Failed to compare trees");
      }

      const comparisonResult = await compareResponse.json();

      setModalContent((prev) => ({
        ...prev,
        comparisonData: comparisonResult,
      }));
    } catch (error) {
      console.error("Falha ao comparar árvores:", error);
      setModalContent(null);
      setModalContentType("error");
    } finally {
      setIsComparisonLoading(false);
      setIsModalLoading(false);
    }
  };

  const isTreeFile = (item) => {
    return (
      item.type === "file" &&
      (item.name.endsWith(".nwk") ||
        item.name.endsWith(".nexus") ||
        item.name.endsWith(".tree"))
    );
  };

  const generateBreadcrumbItems = () => {
    if (!currentPath) return null;

    const relativePath = currentPath.replace(
      new RegExp(`^${selectedProject}/?`),
      ""
    );
    const pathParts = relativePath.split("/").filter(Boolean);

    let accumulatedPath = selectedProject;

    const items = pathParts.map((part, index) => {
      accumulatedPath = `${accumulatedPath}/${part}`;
      const isLast = index === pathParts.length - 1;
      const pathToNavigate = accumulatedPath;
      return (
        <Breadcrumb.Item key={pathToNavigate}>
          {isLast ? (
            <span>{part}</span>
          ) : (
            <a onClick={() => handleBreadcrumbClick(pathToNavigate)}>{part}</a>
          )}
        </Breadcrumb.Item>
      );
    });

    return [
      <Breadcrumb.Item key="project_root">
        <a onClick={() => handleBreadcrumbClick(selectedProject)}>
          {selectedProject}
        </a>
      </Breadcrumb.Item>,
      ...items,
    ];
  };

  const breadcrumbItems = useMemo(
    () => generateBreadcrumbItems(),
    [currentPath, selectedProject]
  );

  const renderModalContent = () => {
    const viewerContainerStyle = {
      height: "75vh",
      width: "100%",
      overflow: "auto",
      maxWidth: "100%",
    };

    switch (modalContentType) {
      case "comparison":
        return (
          <div style={viewerContainerStyle}>
            <TreeComparisonViewer
              tree1={modalContent?.tree1}
              tree2={modalContent?.tree2}
              tree1Name={modalContent?.tree1Name}
              tree2Name={modalContent?.tree2Name}
              comparisonData={modalContent?.comparisonData}
              metadata={metadata}
              isLoading={isComparisonLoading}
            />
          </div>
        );
      case "patternAnalysis":
        return (
          <div style={{ ...viewerContainerStyle, marginTop: 16 }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <TreePatternAnalysis projectName={selectedProject} />

              <PhylogeneticInsights
                treeData={[metadata[0]]}
                owidMetadata={dadosOWID}
                loading={isLoading}
                error={null}
              />
            </Space>
          </div>
        );
      case "newick":
      case "nexus":
        return (
          <div style={viewerContainerStyle}>
            {showInfoAlert && (
              <Alert
                message="Interactive Features"
                description={
                  <div>
                    <p><strong>• Clickable Taxa/Terminals:</strong> Click on any taxon/terminal to view detailed information about the sequence.</p>
                    <p><strong>• Filters and Highlights:</strong> Apply filters to the view and highlight groups of common information for comparative analysis.</p>
                  </div>
                }
                type="info"
                showIcon
                closable
                onClose={() => setShowInfoAlert(false)}
                style={{ marginBottom: 16 }}
              />
            )}
            <PhylogeneticTreeViewer data={modalContent} metadata={metadata} />
          </div>
        );
      case "fasta":
      case "clustal":
        return (
          <div style={viewerContainerStyle}>
            <MSAViewer data={modalContent} />
          </div>
        );
      case "table":
        return <TableView content={modalContent} />;
      case "json":
        return (
          <pre style={{ maxHeight: "75vh", overflow: "auto" }}>
            {JSON.stringify(JSON.parse(modalContent), null, 2)}
          </pre>
        );
      case "image":
        return (
          <img
            src={modalContent}
            alt={modalItem?.name}
            style={{ maxWidth: "100%", maxHeight: "75vh" }}
          />
        );
      case "cql":
        return (
          <div style={viewerContainerStyle}>
            <CQLExecutor
              fileContent={modalContent}
              fileName={modalItem?.name}
              onClose={handleCloseModal}
            />
          </div>
        );
      case "error":
        return <Empty description="Could not load file contents." />;
      default:
        return (
          <div style={{ maxHeight: "75vh", overflowY: "auto" }}>
            <Typography.Paragraph
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "sans-serif",
              }}
            >
              {modalContent}
            </Typography.Paragraph>
          </div>
        );
    }
  };

  const renderItem = useCallback(
    (item) => {
      const isSelected = selectedItems.some(
        (selected) => selected.path === item.path
      );
      const isTree = isTreeFile(item);
      const isLoading = isItemLoading(item.path);
      setShowAnalysis(true)
      return (
        <List.Item
          onClick={() => !isLoading && handleItemClick(item)}
          style={{
            cursor: isLoading ? "not-allowed" : "pointer",
            padding: "8px",
            backgroundColor: isSelected
              ? "#e6f7ff"
              : isTree && comparisonMode
              ? "#f6ffed"
              : "transparent",
            border: isSelected
              ? "2px solid #1890ff"
              : isTree && comparisonMode
              ? "1px solid #b7eb8f"
              : "1px solid #f0f0f0",
            marginBottom: "4px",
            borderRadius: "6px",
          }}
        >
          <List.Item.Meta
            avatar={
              isLoading ? (
                <Spin size="small" />
              ) : item.type === "directory" ? (
                <FolderOutlined />
              ) : isTree && comparisonMode ? (
                <FileOutlined style={{ color: "#52c41a" }} />
              ) : (
                <FileOutlined />
              )
            }
            title={
              <Space>
                <Typography.Text
                  ellipsis
                  style={{ opacity: isLoading ? 0.7 : 1 }}
                >
                  {item.name}
                  {isLoading && " (Loading...)"}
                </Typography.Text>
                {isSelected && <Tag color="blue">Selected</Tag>}
                {isLoading && <Tag color="processing">Loading</Tag>}
              </Space>
            }
            description={isLoading ? "Loading content, please wait..." : null}
          />
        </List.Item>
      );
    },
    [selectedItems, comparisonMode]
  );

  return (
    <Card style={{ width: "100%", overflow: "auto" }}>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {!initialProjectName && (
          <Select
            showSearch
            placeholder="Select a Project"
            style={{ width: "100%" }}
            value={selectedProject}
            onChange={handleProjectSelect}
            allowClear
          >
            {projects.map((proj) => (
              <Option key={proj.name} value={proj.name}>
                {proj.name}
              </Option>
            ))}
          </Select>
        )}

        {selectedProject && (
          <>
            <Card size="small" style={{ background: "#fafafa" }}>
              <Space
                direction="horizontal"
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <Breadcrumb separator=">">
                  <Breadcrumb.Item
                    href="#"
                    onClick={() => handleProjectSelect(initialProjectName)}
                  >
                    <HomeOutlined />
                    <span style={{ marginLeft: "8px" }}>Projects</span>
                  </Breadcrumb.Item>
                  {breadcrumbItems}
                </Breadcrumb>

                {isComparisonAllowed && (
                  <Space
                    direction="horizontal"
                    style={{ width: "100%" }}
                    size="large"
                  >
                    <Button
                      icon={<CompareIcon />}
                      type={comparisonMode ? "primary" : "default"}
                      onClick={toggleComparisonMode}
                    >
                      {comparisonMode
                        ? "Exit Comparison Mode"
                        : "Compare Trees"}
                    </Button>
                    <Button
                      icon={<BarChartOutlined />}
                      type={showAnalysis ? "primary" : "default"}
                      onClick={togglePatternAnalysis}
                    >
                      {showAnalysis ? "Hide Analysis" : "Deep Analysis"}
                    </Button>
                  </Space>
                )}
              </Space>
            </Card>

            {comparisonMode && (
              <Alert
                message="Active Comparison Mode"
                description="Select two trees to compare. Use Ctrl+Click for multiple selection."
                type="info"
                showIcon
                action={
                  <Button
                    type="primary"
                    size="small"
                    disabled={selectedItems.length !== 2}
                    onClick={handleCompareSelected}
                  >
                    Compare selected
                  </Button>
                }
              />
            )}

            {error && (
              <Alert message="Erro" description={error} type="error" showIcon />
            )}

            <List
              loading={isLoading}
              itemLayout="horizontal"
              dataSource={directoryContent}
              renderItem={renderItem}
              locale={{ emptyText: "This folder is empty." }}
              style={{ maxHeight: "50vh", overflow: "auto", width: "100%" }}
            />
          </>
        )}
      </Space>

      <Modal
        title={
          modalContentType === "comparison"
            ? `Comparison: ${selectedItems[0]?.name} vs ${selectedItems[1]?.name}`
            : modalItem
            ? `Viewing: ${modalItem.name}`
            : ""
        }
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width="90vw"
        style={{ top: 20, maxWidth: "90vw" }}
        // destroyOnClose
      >
        {renderModalContent()}
      </Modal>
    </Card>
  );
};
export default ProjectExplorer;