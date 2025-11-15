import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  Button,
  Upload,
  message,
  Alert,
  Space,
  Typography,
  Progress,
  Row,
  Col,
  Statistic,
  Tag,
  List,
  Collapse,
  Tooltip,
} from "antd";
import {
  PlayCircleOutlined,
  RedoOutlined,
  FileTextOutlined,
  CloseOutlined,
  UploadOutlined,
  PauseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useNotification } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Panel } = Collapse;

const CQLExecutor = ({
  fileContent: initialContent,
  fileName: initialName,
  projectName = null,
  onClose,
}) => {
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [currentNotificationId, setCurrentNotificationId] = useState(null);
  const [executionStats, setExecutionStats] = useState({
    totalBlocks: 0,
    completedBlocks: 0,
    successfulBlocks: 0,
    failedBlocks: 0,
    progress: 0,
    currentBlock: 0,
    status: "idle",
  });
  const [executionConfig] = useState({
    delayBetweenCommands: 100,
  });
  const [cqlBlocks, setCqlBlocks] = useState([]);
  const [executionDetails, setExecutionDetails] = useState([]);

  const navigate = useNavigate();
  const abortControllerRef = useRef(null);
  const executionQueueRef = useRef([]);
  const currentIndexRef = useRef(0);
  const isMountedRef = useRef(true);
  const executionStateRef = useRef({
    isExecuting: false,
    isPaused: false,
  });
  const { addNotification, removeNotification, updateNotification } =
    useNotification();

  const API_BASE_URL = "http://localhost:8000";

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupResources();
    };
  }, []);

  useEffect(() => {
    executionStateRef.current = {
      isExecuting,
      isPaused,
    };
  }, [isExecuting, isPaused]);

  useEffect(() => {
    console.log("📊 Current state:", {
      fileName,
      fileContentLength: fileContent?.length,
      cqlBlocksLength: cqlBlocks.length,
      isExecuting,
      isPaused,
    });
  }, [fileName, fileContent, cqlBlocks, isExecuting, isPaused]);

  useEffect(() => {
    if (initialContent) {
      setFileContent(initialContent);
      processCQLContent(initialContent);
      setFileName(initialName);
    }
  }, [initialContent, initialName]);

  const debugCQLBlock = (block, index) => {
    console.log(`🔍 Debug Block ${index + 1}:`, {
      length: block.length,
      hasSingleQuotes: (block.match(/'/g) || []).length,
      hasDoubleQuotes: (block.match(/"/g) || []).length,
      first100Chars: block.substring(0, 100),
      last50Chars: block.substring(block.length - 50),
    });
  };

  const processCQLContent = (content) => {
    const blocks = parseCQLBlocks(content);
    setCqlBlocks(blocks);

    

    console.log(`Parsed blocks: ${blocks.length} commands found`);

    setExecutionStats((prev) => ({
      ...prev,
      totalBlocks: blocks.length,
      currentBlock: 0,
      progress: 0,
    }));

    const details = blocks.map((block, index) => ({
      index,
      command: block,
      status: "pending",
      result: null,
      error: null,
      timestamp: null,
    }));
    setExecutionDetails(details);
  };

  const retryCommand = async (commandIndex) => {
    if (isExecuting) {
      message.warning("Cannot retry while execution is in progress");
      return;
    }

    console.log(`🔄 Retrying command ${commandIndex + 1}`);

    setExecutionDetails((prev) =>
      prev.map((detail, idx) =>
        idx === commandIndex
          ? { ...detail, status: "executing", error: null, result: null }
          : detail
      )
    );

    try {
      const command = cqlBlocks[commandIndex];

      const response = await fetch(`${API_BASE_URL}/api/cql/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: command,
          parameters: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();

      setExecutionDetails((prev) =>
        prev.map((detail, idx) =>
          idx === commandIndex
            ? {
                ...detail,
                status: "success",
                result: result,
                timestamp: new Date(),
              }
            : detail
        )
      );

      setExecutionStats((prev) => ({
        ...prev,
        successfulBlocks: prev.successfulBlocks + 1,
        failedBlocks: prev.failedBlocks - 1,
      }));

      message.success(`Command ${commandIndex + 1} executed successfully`);
    } catch (error) {
      console.error(`❌ Retry failed for command ${commandIndex + 1}:`, error);

      setExecutionDetails((prev) =>
        prev.map((detail, idx) =>
          idx === commandIndex
            ? {
                ...detail,
                status: "error",
                error: error.message,
                timestamp: new Date(),
              }
            : detail
        )
      );

      message.error(`Retry failed for command ${commandIndex + 1}`);
    }
  };

  // const escapeCQLString = (cqlBlock) => {
  //   let escapedBlock = cqlBlock;

  //   const metadataPatterns = [
  //     /(MERGE\s*\(\w*:\s*Metadata\s*\{[^}]*value:\s*')([^']*)('[^}]*\}\))/gi,
  //     /(CREATE\s*\(\w*:\s*Metadata\s*\{[^}]*value:\s*')([^']*)('[^}]*\}\))/gi,
  //     /(\{value:\s*')([^']*)('\})/gi,
  //   ];

  //   metadataPatterns.forEach((pattern) => {
  //     escapedBlock = escapedBlock.replace(
  //       pattern,
  //       (match, prefix, jsonContent, suffix) => {
  //         try {
  //           console.log(
  //             "JSON content to escape:",
  //             jsonContent.substring(0, 200) + "..."
  //           );

  //           let escapedJson = jsonContent.replace(/;/g, "\\;");

  //           escapedJson = escapedJson.replace(/'/g, "''");

  //           escapedJson = escapedJson
  //             .replace(/\n/g, "\\\\n")
  //             .replace(/\r/g, "\\\\r")
  //             .replace(/\t/g, "\\\\t");

  //           try {
  //             const tempJsonForValidation = escapedJson
  //               .replace(/''/g, "'")
  //               .replace(/\\;/g, ";");
  //             JSON.parse(tempJsonForValidation);
  //             console.log("✅ JSON validation passed after escaping ;");
  //           } catch (e) {
  //             console.warn(
  //               "JSON validation failed, using basic escape:",
  //               e.message
  //             );
  //             escapedJson = jsonContent
  //               .replace(/;/g, "\\;")
  //               .replace(/'/g, "''");
  //           }

  //           const result = `${prefix}${escapedJson}${suffix}`;
  //           console.log(
  //             "Escaped result (first 300 chars):",
  //             result.substring(0, 300)
  //           );

  //           if (jsonContent.includes(";") && !result.includes("\\;")) {
  //             console.warn(
  //               "⚠️  Ponto e vírgula não foi escapado corretamente!"
  //             );
  //           }

  //           return result;
  //         } catch (error) {
  //           console.error("Failed to escape JSON content:", error);
  //           return match;
  //         }
  //       }
  //     );
  //   });

  //   return escapedBlock;
  // };

  const parseCQLBlocks = (content) => {
    if (!content) return [];

    const cleanedContent = content
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

    const blocks = [];
    let currentBlock = "";
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let isEscaped = false;

    for (let i = 0; i < cleanedContent.length; i++) {
      const char = cleanedContent[i];
      currentBlock += char;

      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === ";" && !inSingleQuote && !inDoubleQuote) {
        const block = currentBlock.trim();
        if (block.length > 0) {
          blocks.push(block);
        }
        currentBlock = "";
      }
    }

    const lastBlock = currentBlock.trim();
    if (lastBlock.length > 0 && lastBlock !== ";") {
      blocks.push(lastBlock);
    }

    console.log(`Parsed ${blocks.length} CQL blocks (smart parser)`);
    return blocks;
  };

  const cleanupResources = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (currentNotificationId) {
      removeNotification(currentNotificationId);
      setCurrentNotificationId(null);
    }
    setIsExecuting(false);
    setIsPaused(false);
    executionStateRef.current = {
      isExecuting: false,
      isPaused: false,
    };
  };

  const executeCQL = async () => {
    if (!fileName && !projectName) {
      message.warning("No file or project selected!");
      return;
    }

    if (cqlBlocks.length === 0) {
      message.warning("No CQL commands to execute!");
      return;
    }

    await executeCQLDirect();
  };

  const executeCQLDirect = async () => {
    if (!fileName && !projectName) {
      message.warning("No file or project selected!");
      return;
    }

    if (cqlBlocks.length === 0) {
      message.warning("No CQL commands to execute!");
      return;
    }

    console.log("🚀 STARTING CQL EXECUTION");

    setExecutionResult(null);
    setIsPaused(false);

    executionStateRef.current = {
      isExecuting: true,
      isPaused: false,
    };

    setIsExecuting(true);

    setExecutionStats({
      totalBlocks: cqlBlocks.length,
      completedBlocks: 0,
      successfulBlocks: 0,
      failedBlocks: 0,
      progress: 0,
      currentBlock: 0,
      status: "executing",
    });

    const notificationId = addNotification({
      type: "info",
      message: "Starting CQL Execution",
      description: `Processing ${cqlBlocks.length} commands...`,
      duration: 0,
      showProgress: false,
      progress: 0,
    });
    setCurrentNotificationId(notificationId);

    executionQueueRef.current = [...cqlBlocks];
    currentIndexRef.current = 0;

    console.log(
      "📋 Queue prepared:",
      executionQueueRef.current.length,
      "commands"
    );

    executeNextCommand(notificationId);
  };

  const executeNextCommand = async (notificationId, retryCount = 0) => {
    const currentState = executionStateRef.current;

    console.log("🔄 executeNextCommand called", {
      mounted: isMountedRef.current,
      executing: currentState.isExecuting,
      paused: currentState.isPaused,
      currentIndex: currentIndexRef.current,
      queueLength: executionQueueRef.current.length,
    });

    if (!isMountedRef.current || !currentState.isExecuting) {
      console.log("❌ Execution stopped or component unmounted");
      return;
    }

    if (currentState.isPaused) {
      console.log("⏸️ Execution paused, waiting for resume...");
      return;
    }

    if (currentIndexRef.current >= executionQueueRef.current.length) {
      console.log("✅ ALL COMMANDS COMPLETED");
      finishExecution(notificationId, true);
      return;
    }

    const currentBlock = executionQueueRef.current[currentIndexRef.current];
    const blockIndex = currentIndexRef.current;

    console.log(
      `▶️ Executing command ${blockIndex + 1}/${
        executionQueueRef.current.length
      }`
    );

    setExecutionDetails((prev) =>
      prev.map((detail, idx) =>
        idx === blockIndex
          ? { ...detail, status: "executing", timestamp: new Date() }
          : detail
      )
    );

    setExecutionStats((prev) => ({
      ...prev,
      currentBlock: blockIndex + 1,
      status: "executing",
    }));

    try {
      console.log(`📤 Sending command ${blockIndex + 1} to backend`);

      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE_URL}/api/cql/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: currentBlock,
          parameters: {},
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();

        console.log(
          `🔄 Retrying command ${blockIndex + 1} (attempt ${retryCount + 1})`
        );
        setTimeout(() => {
          executeNextCommand(notificationId, retryCount + 1);
        }, 1000 * (retryCount + 1));

        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Command ${blockIndex + 1} executed successfully`);

      setExecutionDetails((prev) =>
        prev.map((detail, idx) =>
          idx === blockIndex
            ? {
                ...detail,
                status: "success",
                result: result,
                timestamp: new Date(),
              }
            : detail
        )
      );

      setExecutionStats((prev) => {
        const newStats = {
          ...prev,
          completedBlocks: prev.completedBlocks + 1,
          successfulBlocks: prev.successfulBlocks + 1,
          progress: Math.round(((blockIndex + 1) / prev.totalBlocks) * 100),
        };

        updateNotification(notificationId, {
          progress: newStats.progress, 
          message: `Executing CQL - ${blockIndex + 1}/${cqlBlocks.length}`,
          description: (
            <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  <Text strong>Total:</Text> {cqlBlocks.length}
                </span>
                <span>
                  <Text strong>Executing:</Text> {blockIndex + 1}
                </span>
                <span style={{ color: "#3f8600" }}>
                  <Text strong>Success:</Text> {newStats.successfulBlocks}{" "}
                </span>
                <span style={{ color: "#cf1322" }}>
                  <Text strong>Failures:</Text> {newStats.failedBlocks}{" "}
                </span>
              </div>
              <div
                style={{ marginTop: "4px", color: "#8c8c8c", fontSize: "11px" }}
              >
                Progress: {newStats.progress}%
              </div>
            </div>
          ),
        });

        return newStats; 
      });
    } catch (error) {
      if (error.name === "AbortError") {
        console.log(`⏸️ Command ${blockIndex + 1} aborted`);
        return;
      }

      console.error(`❌ Command ${blockIndex + 1} failed:`, error.message);

      setExecutionDetails((prev) =>
        prev.map((detail, idx) =>
          idx === blockIndex
            ? {
                ...detail,
                status: "error",
                error: error.message,
                timestamp: new Date(),
              }
            : detail
        )
      );

      setExecutionStats((prev) => {
        const newStats = {
          ...prev,
          completedBlocks: prev.completedBlocks + 1,
          failedBlocks: prev.failedBlocks + 1,
          progress: Math.round(((blockIndex + 1) / prev.totalBlocks) * 100),
        };
        return newStats;
      });

      const currentStats = executionStats;
      updateNotification(notificationId, {
        progress: Math.round(((blockIndex + 1) / cqlBlocks.length) * 100),
        message: `Executing CQL - ${blockIndex + 1}/${cqlBlocks.length}`,
        description: (
          <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span>
                <Text strong>Total:</Text> {cqlBlocks.length}
              </span>
              <span>
                <Text strong>Executing:</Text> {blockIndex + 1}
              </span>
              <span style={{ color: "#3f8600" }}>
                <Text strong>Success:</Text> {currentStats.successfulBlocks}
              </span>
              <span style={{ color: "#cf1322" }}>
                <Text strong>Failures:</Text> {currentStats.failedBlocks + 1}
              </span>
            </div>
            <div
              style={{ marginTop: "4px", color: "#8c8c8c", fontSize: "11px" }}
            >
              Progress:{" "}
              {Math.round(((blockIndex + 1) / cqlBlocks.length) * 100)}%
            </div>
          </div>
        ),
      });
    } finally {
      abortControllerRef.current = null;
    }

    currentIndexRef.current++;

    const nextState = executionStateRef.current;
    if (isMountedRef.current && nextState.isExecuting && !nextState.isPaused) {
      setTimeout(() => {
        executeNextCommand(notificationId);
      }, executionConfig.delayBetweenCommands);
    } else {
      console.log(
        "⏸️ Execution paused or stopped, not scheduling next command"
      );
    }
  };

  const finishExecution = (notificationId, success) => {
    console.log("🏁 Finishing execution", { success });

    executionStateRef.current = {
      isExecuting: false,
      isPaused: false,
    };

    setIsExecuting(false);
    setIsPaused(false);

    const finalStats = { ...executionStats };

    setExecutionResult({
      success,
      stats: {
        totalBlocks: finalStats.totalBlocks,
        executedBlocks: finalStats.successfulBlocks,
        failedBlocks: finalStats.failedBlocks,
        successRate:
          finalStats.totalBlocks > 0
            ? Math.round(
                (finalStats.successfulBlocks / finalStats.totalBlocks) * 100
              )
            : 0,
      },
      detailedResults: executionDetails,
    });

    if (success) {
      updateNotification(notificationId, {
        type: "success",
        message: "CQL Execution Completed",
        description: (
          <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "4px",
              }}
            >
              <span>
                <Text strong>Total:</Text> {executionStats.totalBlocks}
              </span>
              <span style={{ color: "#3f8600" }}>
                <Text strong>Success:</Text> {executionStats.successfulBlocks}
              </span>
              <span style={{ color: "#cf1322" }}>
                <Text strong>Failures:</Text> {executionStats.failedBlocks}
              </span>
            </div>
            <div style={{ color: "#52c41a", fontWeight: "bold" }}>
              Success rate:{" "}
              {Math.round(
                (executionStats.successfulBlocks / executionStats.totalBlocks) *
                  100
              )}
              %
            </div>
          </div>
        ),
        duration: 10,
      });
      message.success(
        `Execution completed: ${executionStats.successfulBlocks}/${executionStats.totalBlocks} commands successful`
      );
    }

    setCurrentNotificationId(null);
  };

  const pauseExecution = () => {
    console.log("⏸️ Pausing execution");

    executionStateRef.current.isPaused = true;

    setIsPaused(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    message.info("Execution paused");
  };

  const resumeExecution = () => {
    if (!isExecuting) {
      message.warning("No execution in progress");
      return;
    }

    console.log("▶️ Resuming execution");

    executionStateRef.current.isPaused = false;

    setIsPaused(false);

    message.info("Execution resumed");

    if (currentNotificationId) {
      console.log("Continuing execution from command", currentIndexRef.current);
      setTimeout(() => {
        executeNextCommand(currentNotificationId);
      }, executionConfig.delayBetweenCommands);
    }
  };

  const stopExecution = () => {
    console.log("🛑 Stopping execution");

    executionStateRef.current = {
      isExecuting: false,
      isPaused: false,
    };

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (currentNotificationId) {
      finishExecution(currentNotificationId, false);
    } else {
      setIsExecuting(false);
      setIsPaused(false);
    }

    message.warning("Execution stopped by user");
  };

  const handleFileUpload = async (info) => {
    const { file } = info;

    if (file.status === "uploading") {
      return;
    }

    if (file.status === "done") {
      const content = file.response?.content || "";
      setFileContent(content);
      processCQLContent(content);
      setFileName(file.name);
      message.success(`${file.name} loaded successfully!`);
    } else if (file.status === "error") {
      message.error(`Failed to upload ${file.name}.`);
    }
  };

  const beforeUpload = (file) => {
    const isCQL = file.name.endsWith(".cql");
    if (!isCQL) {
      message.error("Only .cql files are allowed!");
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest = async ({ file, onSuccess, onError }) => {
    try {
      const content = await readFileContent(file);
      onSuccess({ content }, file);
    } catch (error) {
      onError(error);
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const clearSelection = () => {
    setFileContent("");
    setFileName("");
    setCqlBlocks([]);
    setExecutionDetails([]);
    setExecutionResult(null);
    stopExecution();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
      case "error":
        return <CloseCircleOutlined style={{ color: "#ff4d4f" }} />;
      case "executing":
        return <LoadingOutlined style={{ color: "#1890ff" }} />;
      default:
        return <FileTextOutlined style={{ color: "#d9d9d9" }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "executing":
        return "processing";
      default:
        return "default";
    }
  };

  const draggerProps = {
    name: "file",
    multiple: false,
    accept: ".cql",
    beforeUpload: beforeUpload,
    customRequest: customRequest,
    onChange: handleFileUpload,
    showUploadList: true,
  };

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          <span>CQL Executor</span>
          {cqlBlocks.length > 0 && (
            <Tag color="green">{cqlBlocks.length} commands</Tag>
          )}
        </Space>
      }
      style={{ width: "100%" }}
      extra={
        <Button type="primary" onClick={() => navigate("/analysis")}>
          Neo4j Visualizer
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {/* Upload Section */}
        <div>
          {!fileName ? (
            <Dragger {...draggerProps} style={{ padding: "20px" }}>
              <p>
                <UploadOutlined />
              </p>
              <p>Click or drag CQL file</p>
              <p>Supports files of any size with sequential execution</p>
            </Dragger>
          ) : (
            <Alert
              message={
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text strong>{fileName}</Text>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {cqlBlocks.length} commands detected
                  </Text>
                </Space>
              }
              type="info"
              showIcon
              style={{ marginTop: "8px" }}
              action={
                <Space>
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={clearSelection}
                    disabled={isExecuting}
                  >
                    Clear
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={executeCQL}
                    loading={isExecuting}
                    disabled={cqlBlocks.length === 0}
                  >
                    Execute
                  </Button>
                </Space>
              }
            />
          )}
        </div>

        {cqlBlocks.length > 0 && (
          <Card
            size="small"
            title={`Preview - ${cqlBlocks.length} commands detected`}
          >
            <Collapse size="small">
              <Panel header="View commands" key="1">
                <List
                  size="small"
                  dataSource={cqlBlocks.slice(0, 5)}
                  renderItem={(block, index) => (
                    <List.Item>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Text strong>Command {index + 1}:</Text>
                        <pre
                          style={{
                            fontSize: "11px",
                            backgroundColor: "#f5f5f5",
                            padding: "4px",
                            borderRadius: "2px",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {block.length > 100
                            ? block.substring(0, 100) + "..."
                            : block}
                        </pre>
                      </Space>
                    </List.Item>
                  )}
                />
                {cqlBlocks.length > 5 && (
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    ... and {cqlBlocks.length - 5} more commands
                  </Text>
                )}
              </Panel>
            </Collapse>
          </Card>
        )}

        {isExecuting && (
          <Card
            size="small"
            title={
              <Space>
                <span>Execution in Progress</span>
                {isPaused && <Tag color="orange">PAUSED</Tag>}
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Progress
                percent={executionStats.progress}
                status={
                  executionStats.failedBlocks > 0 ? "exception" : "active"
                }
              />

              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Total Commands"
                    value={executionStats.totalBlocks}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Current"
                    value={`${executionStats.currentBlock}/${executionStats.totalBlocks}`}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Success"
                    value={executionStats.successfulBlocks}
                    valueStyle={{ color: "#3f8600" }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Failures"
                    value={executionStats.failedBlocks}
                    valueStyle={{ color: "#cf1322" }}
                  />
                </Col>
              </Row>

              <Space>
                {isPaused ? (
                  <Button
                    type="primary"
                    onClick={resumeExecution}
                    icon={<PlayCircleOutlined />}
                  >
                    Resume
                  </Button>
                ) : (
                  <Button icon={<PauseOutlined />} onClick={pauseExecution}>
                    Pause
                  </Button>
                )}
                <Button danger onClick={stopExecution}>
                  Stop Execution
                </Button>
              </Space>
            </Space>
          </Card>
        )}

        {isExecuting &&
          executionDetails.some((d) => d.status !== "pending") && (
            <Card size="small" title="Execution Details (last 10)">
              <List
                size="small"
                dataSource={executionDetails
                  .filter((d) => d.status !== "pending")
                  .slice(-10)}
                renderItem={(detail) => (
                  <List.Item>
                    <Space>
                      {getStatusIcon(detail.status)}
                      <Tag color={getStatusColor(detail.status)}>
                        Command {detail.index + 1}
                      </Tag>
                      <Text style={{ fontSize: "12px" }}>
                        {detail.command.length > 50
                          ? detail.command.substring(0, 50) + "..."
                          : detail.command}
                      </Text>
                      {detail.error && (
                        <Text type="secondary" style={{ fontSize: "11px" }}>
                          Error: {detail.error}
                        </Text>
                      )}
                      {detail.status === "error" && (
                        <Tooltip title="Retry this command">
                          <Button
                            size="small"
                            icon={<RedoOutlined />}
                            onClick={() => retryCommand(detail.index)}
                            style={{ marginLeft: 8 }}
                          >
                            Retry
                          </Button>
                        </Tooltip>
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          )}

        {executionResult && !isExecuting && (
          <div>
            <Title level={5}>Execution Result:</Title>
            <Alert
              message={`Execution Completed - ${executionResult.stats.successRate}% success rate`}
              description={
                <div>
                  <p>
                    <strong>{executionResult.stats.executedBlocks}</strong> of{" "}
                    <strong>{executionResult.stats.totalBlocks}</strong>{" "}
                    commands executed successfully
                  </p>
                  <p>
                    <strong>{executionResult.stats.failedBlocks}</strong>{" "}
                    commands failed
                  </p>

                  {/* <Collapse size="small" style={{ marginTop: 16 }}>
                    <Panel header="View complete details" key="1">
                      <List
                        size="small"
                        dataSource={executionResult.detailedResults.slice(
                          0,
                          10
                        )}
                        renderItem={(detail) => (
                          <List.Item>
                            <Space
                              direction="vertical"
                              style={{ width: "100%" }}
                            >
                              <Space>
                                {getStatusIcon(detail.status)}
                                <Text strong>Command {detail.index + 1}:</Text>
                                <Tag color={getStatusColor(detail.status)}>
                                  {detail.status === "success"
                                    ? "Success"
                                    : detail.status === "error"
                                    ? "Failure"
                                    : "Pending"}
                                </Tag>
                                {detail.status === "error" && (
                                  <Tooltip title="Retry this command">
                                    <Button
                                      size="small"
                                      icon={<RedoOutlined />}
                                      onClick={() => retryCommand(detail.index)}
                                    >
                                      Retry
                                    </Button>
                                  </Tooltip>
                                )}
                              </Space>
                              <pre
                                style={{
                                  fontSize: "11px",
                                  backgroundColor: "#f5f5f5",
                                  padding: "4px",
                                  borderRadius: "2px",
                                  margin: 0,
                                }}
                              >
                                {detail.command}
                              </pre>
                              {detail.error && (
                                <Text
                                  type="danger"
                                  style={{ fontSize: "11px" }}
                                >
                                  <strong>Error:</strong> {detail.error}
                                </Text>
                              )}
                            </Space>
                          </List.Item>
                        )}
                      />
                      {executionResult?.detailedResults?.detailedResults?.length > 5 && (
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          ... and {executionResult?.detailedResults?.detailedResults?.length - 10} more commands
                        </Text>
                      )}
                    </Panel>
                  </Collapse> */}
                </div>
              }
              type={executionResult.success ? "success" : "warning"}
              showIcon
            />
          </div>
        )}
      </Space>
    </Card>
  );
};

export default CQLExecutor;
