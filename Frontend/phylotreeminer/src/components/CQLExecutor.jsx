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
  Input,
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
import { useUser } from "../contexts/UserContext";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Panel } = Collapse;

const CQLExecutor = ({
  fileContent: initialContent,
  fileName: initialName,
  projectName = null,
  onClose,
  truncated = false,
  totalBytes = null,
  previewBytes = null,
}) => {
  const [editedCommands, setEditedCommands] = useState({});
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
  // M4.23: banner de "Neo4j fora do ar" — distinto do erro genérico de comando,
  // preenchido a partir do corpo 503 devolvido por /api/cql/execute[-batch].
  const [neo4jUnavailable, setNeo4jUnavailable] = useState(null);
  const { userId } = useUser();
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

  const retryCommand = async (commandIndex, customCommand = null) => {
    if (isExecuting) {
      message.warning("Cannot retry while batch execution is in progress");
      return;
    }

    const commandToExecute = customCommand || cqlBlocks[commandIndex];

    setExecutionDetails((prev) =>
      prev.map((detail, idx) =>
        idx === commandIndex
          ? { ...detail, status: "executing", error: null, result: null }
          : detail,
      ),
    );

    try {
      const response = await fetch(`${API_BASE_URL}/api/cql/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: commandToExecute,
          parameters: {},
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 503) {
          const err = new Error(
            errorData.message || "Neo4j indisponível no momento.",
          );
          err.isNeo4jUnavailable = true;
          throw err;
        }
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      setNeo4jUnavailable(null);
      const result = await response.json();

      setCqlBlocks((prev) => {
        const newBlocks = [...prev];
        newBlocks[commandIndex] = commandToExecute;
        return newBlocks;
      });

      setExecutionDetails((prev) =>
        prev.map((detail, idx) =>
          idx === commandIndex
            ? {
                ...detail,
                command: commandToExecute,
                status: "success",
                result: result,
                timestamp: new Date(),
              }
            : detail,
        ),
      );

      setExecutionStats((prev) => ({
        ...prev,
        successfulBlocks: prev.successfulBlocks + 1,
        failedBlocks: prev.failedBlocks - 1,
      }));

      setEditedCommands((prev) => {
        const newState = { ...prev };
        delete newState[commandIndex];
        return newState;
      });

      message.success(`Command ${commandIndex + 1} executed successfully`);
    } catch (error) {
      console.error(`Retry failed for command ${commandIndex + 1}:`, error);

      if (error.isNeo4jUnavailable) {
        setNeo4jUnavailable({ message: error.message });
      }

      setExecutionDetails((prev) =>
        prev.map((detail, idx) =>
          idx === commandIndex
            ? {
                ...detail,
                status: "error",
                error: error.message,
                timestamp: new Date(),
              }
            : detail,
        ),
      );

      message.error(`Retry failed for command ${commandIndex + 1}`);
    }
  };

  const handleCommandEdit = (index, value) => {
    setEditedCommands((prev) => ({ ...prev, [index]: value }));
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
    if (lastBlock.length > 0) {
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

    executeNextCommand(notificationId);
  };

  const executeNextCommand = async (notificationId, retryCount = 0) => {
    const currentState = executionStateRef.current;

    if (!isMountedRef.current || !currentState.isExecuting) {
      return;
    }

    if (currentState.isPaused) {
      return;
    }

    if (currentIndexRef.current >= executionQueueRef.current.length) {
      finishExecution(notificationId, true);
      return;
    }

    const blockIndex = currentIndexRef.current;
    const BATCH_SIZE = 500;

    const currentChunk = executionQueueRef.current.slice(
      blockIndex,
      blockIndex + BATCH_SIZE,
    );

    const endIndex = Math.min(
      blockIndex + BATCH_SIZE,
      executionQueueRef.current.length,
    );

    setExecutionStats((prev) => ({
      ...prev,
      currentBlock: endIndex,
      status: "executing",
    }));

    // setExecutionDetails((prev) =>
    //   prev.map((detail, idx) =>
    //     (idx >= blockIndex && idx < endIndex)
    //       ? { ...detail, status: "executing", timestamp: new Date() }
    //       : detail,
    //   ),
    // );

    setExecutionDetails((prev) => {
      const newDetails = [...prev];
      for (let i = blockIndex; i < endIndex; i++) {
        newDetails[i] = {
          ...newDetails[i],
          status: "executing",
          timestamp: new Date(),
        };
      }
      return newDetails;
    });

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE_URL}/api/cql/execute-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: currentChunk,
          user_id: userId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 503) {
          const err = new Error(
            errorData.message || "Neo4j indisponível no momento.",
          );
          err.isNeo4jUnavailable = true;
          throw err;
        }
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      setNeo4jUnavailable(null);
      const result = await response.json();

      // setExecutionDetails((prev) =>
      //   prev.map((detail, idx) =>
      //     (idx >= blockIndex && idx < endIndex)
      //       ? {
      //           ...detail,
      //           status: "success",
      //           result: result,
      //           timestamp: new Date(),
      //         }
      //       : detail,
      //   ),
      // );

      setExecutionDetails((prev) => {
        const newDetails = [...prev];
        for (let i = blockIndex; i < endIndex; i++) {
          const apiResult = result.results
            ? result.results[i - blockIndex]
            : null;
          const isSuccess = apiResult ? apiResult.success : true;

          newDetails[i] = {
            ...newDetails[i],
            status: isSuccess ? "success" : "error",
            error: isSuccess ? null : apiResult?.error,
            result: apiResult,
            timestamp: new Date(),
          };
        }
        return newDetails;
      });

      setExecutionStats((prev) => {
        const newStats = {
          ...prev,
          completedBlocks: prev.completedBlocks + currentChunk.length,
          successfulBlocks: prev.successfulBlocks + result.executed,
          failedBlocks:
            prev.failedBlocks + (currentChunk.length - result.executed),
          progress: Math.round((endIndex / prev.totalBlocks) * 100),
        };

        updateNotification(notificationId, {
          progress: newStats.progress,
          message: `Executing CQL - ${endIndex}/${cqlBlocks.length}`,
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
                  <Text strong>Executing:</Text> {endIndex}
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
        return;
      }

      console.error(
        `Command batch starting at ${blockIndex} failed:`,
        error.message,
      );

      if (error.isNeo4jUnavailable) {
        setNeo4jUnavailable({ message: error.message });
      }

      // setExecutionDetails((prev) =>
      //   prev.map((detail, idx) =>
      //     (idx >= blockIndex && idx < endIndex)
      //       ? {
      //           ...detail,
      //           status: "error",
      //           error: error.message,
      //           timestamp: new Date(),
      //         }
      //       : detail,
      //   ),
      // );
      setExecutionDetails((prev) => {
        const newDetails = [...prev];
        for (let i = blockIndex; i < endIndex; i++) {
          newDetails[i] = {
            ...newDetails[i],
            status: "error",
            error: error.message,
            timestamp: new Date(),
          };
        }
        return newDetails;
      });

      setExecutionStats((prev) => {
        const newStats = {
          ...prev,
          completedBlocks: prev.completedBlocks + currentChunk.length,
          failedBlocks: prev.failedBlocks + currentChunk.length,
          progress: Math.round((endIndex / prev.totalBlocks) * 100),
        };

        // Alteração: A atualização da notificação foi movida para dentro do setState
        // para garantir que os valores mais recentes (newStats) sejam exibidos,
        // evitando problemas de concorrência com o estado anterior.
        updateNotification(notificationId, {
          progress: newStats.progress,
          message: `Executing CQL - ${endIndex}/${cqlBlocks.length}`,
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
                  <Text strong>Executing:</Text> {endIndex}
                </span>
                <span style={{ color: "#3f8600" }}>
                  <Text strong>Success:</Text> {newStats.successfulBlocks}
                </span>
                <span style={{ color: "#cf1322" }}>
                  <Text strong>Failures:</Text> {newStats.failedBlocks}
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
    } finally {
      abortControllerRef.current = null;
    }

    currentIndexRef.current += BATCH_SIZE;

    const nextState = executionStateRef.current;
    if (isMountedRef.current && nextState.isExecuting && !nextState.isPaused) {
      setTimeout(() => {
        executeNextCommand(notificationId);
      }, executionConfig.delayBetweenCommands);
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
                (finalStats.successfulBlocks / finalStats.totalBlocks) * 100,
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
                  100,
              )}
              %
            </div>
          </div>
        ),
        duration: 10,
      });
      message.success(
        `Execution completed: ${executionStats.successfulBlocks}/${executionStats.totalBlocks} commands successful`,
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
        {neo4jUnavailable && (
          <Alert
            message="Neo4j indisponível"
            description={`${neo4jUnavailable.message} Tente novamente em instantes.`}
            type="warning"
            showIcon
            closable
            onClose={() => setNeo4jUnavailable(null)}
          />
        )}
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
            <>
              {truncated && (
                <Alert
                  message="Arquivo maior que o limite de pré-visualização"
                  description={
                    totalBytes
                      ? `Mostrando apenas os primeiros ${(previewBytes / 1e6).toFixed(1)} MB de ${(totalBytes / 1e6).toFixed(1)} MB. Os comandos abaixo são um prefixo válido do arquivo, não o conteúdo inteiro — a execução em lote foi desabilitada para não gravar um subconjunto parcial no banco.`
                      : "Este arquivo excede o limite de pré-visualização; os comandos abaixo são apenas um prefixo do conteúdo total."
                  }
                  type="warning"
                  showIcon
                  style={{ marginBottom: "8px" }}
                />
              )}
              <Alert
                message={
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text strong>{fileName}</Text>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {cqlBlocks.length} commands detected
                      {truncated ? " (prefixo truncado)" : ""}
                    </Text>
                  </Space>
                }
                type={truncated ? "warning" : "info"}
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
                    <Tooltip
                      title={
                        truncated
                          ? "Desabilitado: o arquivo foi truncado na pré-visualização. Execute o arquivo completo pelo pipeline/servidor."
                          : ""
                      }
                    >
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={executeCQL}
                        loading={isExecuting}
                        disabled={cqlBlocks.length === 0 || truncated}
                      >
                        Execute
                      </Button>
                    </Tooltip>
                  </Space>
                }
              />
            </>
          )}
        </div>

        {isExecuting && (
          <Alert
            message={
              <Space direction="vertical" style={{ width: "100%" }}>
                {/* <Text strong>
                  Aguarde a execução completa dos comandos CQL. Após alimentar o
                  banco de dados as consultas poderao ser feitas no termianl{" "}
                  <Tag>Neo4j Visualizer</Tag>
                </Text> */}
                <Text>
                  Please wait! The execution of the CQL commands is currently in
                  progress. Once the database has been fully populated, you will
                  be able to perform your queries directly within the{" "}
                  <Tag>Neo4j Visualizer</Tag>
                  terminal.
                </Text>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginTop: "8px" }}
            closable
          />
        )}

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
            <Card
              size="small"
              title="Execution Details"
              style={{ overflow: "auto",maxHeight: "400px" }}
            >
              <List
                size="small"
                // dataSource={executionDetails
                //   .filter((d) => d.status !== "pending")
                //   // .slice(-10)
                // }
                dataSource={executionDetails
                  .slice(
                    Math.max(0, currentIndexRef.current - 50),
                    currentIndexRef.current + 500,
                  )
                  .filter((d) => d.status !== "pending")
                  .reverse()}
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
            <Title level={4}>Execution Result:</Title>
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
                </div>
              }
              type={executionResult.success ? "success" : "warning"}
              showIcon
            />

            {executionStats.failedBlocks > 0 && (
              <Card
                type="inner"
                title={`Review and Retry Failed Commands (${executionStats.failedBlocks})`}
                style={{ marginTop: 16, borderColor: "#ff4d4f" }}
              >
                <List
                  itemLayout="vertical"
                  dataSource={executionDetails.filter(
                    (d) => d.status === "error",
                  )}
                  renderItem={(item) => (
                    <List.Item>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Space>
                          <Tag color="error">Command {item.index + 1}</Tag>
                          <Text type="danger" strong>
                            Error Details:
                          </Text>
                        </Space>
                        <Alert
                          message={item.error}
                          type="error"
                          style={{ fontSize: "12px", fontFamily: "monospace" }}
                        />

                        <Text strong>Edit Query:</Text>
                        <Input.TextArea
                          rows={4}
                          value={
                            editedCommands[item.index] !== undefined
                              ? editedCommands[item.index]
                              : item.command
                          }
                          onChange={(e) =>
                            handleCommandEdit(item.index, e.target.value)
                          }
                          style={{
                            fontFamily: "monospace",
                            fontSize: "12px",
                            backgroundColor: "#fafafa",
                          }}
                        />

                        <Button
                          type="primary"
                          icon={<RedoOutlined />}
                          onClick={() =>
                            retryCommand(
                              item.index,
                              editedCommands[item.index] || item.command,
                            )
                          }
                          loading={item.status === "executing"}
                        >
                          Retry Command
                        </Button>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </div>
        )}
      </Space>
    </Card>
  );
};

export default CQLExecutor;
