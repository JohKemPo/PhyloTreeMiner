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
} from "antd";
import {
  PlayCircleOutlined,
  FileTextOutlined,
  PauseCircleOutlined,
  DownloadOutlined,
  CloseOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useNotification } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const CQLExecutor = ({
  fileContent: initialContent,
  fileName: initialName,
  onClose,
}) => {
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [currentNotificationId, setCurrentNotificationId] = useState(null);
  const [executionStats, setExecutionStats] = useState({
    totalBlocks: 0,
    completedBlocks: 0,
    failedBlocks: 0,
    progress: 0,
  });
  const navigate = useNavigate();

  const abortControllerRef = useRef(null);
  const executionControllerRef = useRef(null);
  const { addNotification, removeNotification, updateNotification } =
    useNotification();

  const API_BASE_URL = "http://localhost:8000";

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const handleNavigateToNeo4jViewer = () => {
    if (onClose) {
      onClose();
    }

    setTimeout(() => {
      navigate("/analysis");
    }, 100);
  };

  const cleanupResources = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (executionControllerRef.current) {
      executionControllerRef.current.abort();
    }

    if (currentNotificationId) {
      removeNotification(currentNotificationId);
    }
  };

  useEffect(() => {
    if (initialContent) {
      setFileContent(initialContent);
      const blocks = parseCQLBlocks(initialContent);
      setExecutionStats((prev) => ({
        ...prev,
        totalBlocks: blocks.length,
        progress: 0,
      }));
    }
    if (initialName) {
      setFileName(initialName);
    }
  }, [initialContent, initialName]);

  const preprocessCQLContent = (content) => {
    if (!content) return "";
    
    let cleanedContent = content.replace(/\/\/.*$/gm, '');
    
    cleanedContent = cleanedContent.replace(/\/\*[\s\S]*?\*\//g, '');
    
    cleanedContent = cleanedContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    if (cleanedContent.trim() && !cleanedContent.trim().endsWith(';')) {
      cleanedContent += ';';
    }
    
    const createCommands = cleanedContent.match(/CREATE\s+\([^)]+\)/gi) || [];
    const invalidCommands = cleanedContent.match(/CREATE\s+[^(]/gi) || [];
    
    if (invalidCommands.length > 0) {
      console.warn("Comandos CREATE potencialmente inválidos encontrados:", invalidCommands);
    }
    
    return cleanedContent;
  };

  const parseCQLBlocks = (content) => {
    if (!content) return [];

    const cleanContent = preprocessCQLContent(content);

    return cleanContent
      .split(";")
      .map((block) => block.trim())
      .filter((block) => block.length > 0)
      .map((block) => block + ";");
  };

  const extractParametersFromBlock = (block) => {
    const parameters = {};
    const jsonRegex = /(value:\s*)'(\{.*?\})'/gs;

    let match;
    let paramIndex = 0;

    while ((match = jsonRegex.exec(block)) !== null) {
      const [fullMatch, prefix, jsonContent] = match;
      const paramName = `param${paramIndex++}`;

      parameters[paramName] = jsonContent;
    }

    return parameters;
  };

  const convertBlockToParameterized = (block) => {
    let convertedBlock = block;
    const parameters = {};
    const jsonRegex = /(value:\s*)'(\{.*?\})'/gs;

    let match;
    let paramIndex = 0;

    while ((match = jsonRegex.exec(block)) !== null) {
      const [fullMatch, prefix, jsonContent] = match;
      const paramName = `param${paramIndex}`;

      convertedBlock = convertedBlock.replace(
        fullMatch,
        `${prefix}$${paramName}`
      );

      parameters[paramName] = jsonContent;
      paramIndex++;
    }

    return { block: convertedBlock, parameters };
  };

  const executeCQLByBlocks = async () => {
    if (!fileContent) {
      message.warning("No files loaded to run!");
      return;
    }

    setIsExecuting(true);
    setIsPaused(false);
    setExecutionResult(null);

    const preprocessedContent = preprocessCQLContent(fileContent);
    const blocks = parseCQLBlocks(preprocessedContent);
    const totalBlocks = blocks.length;

    if (totalBlocks === 0) {
      message.warning("No valid commands found in file!");
      setIsExecuting(false);
      return;
    }

    setExecutionStats({
      totalBlocks,
      completedBlocks: 0,
      failedBlocks: 0,
      progress: 0,
    });

    const notificationId = addNotification({
      type: "info",
      message: "Running CQL script",
      description: `Preparing ${totalBlocks} blocks...`,
      duration: 0,
      showProgress: true,
      progress: 0,
    });
    setCurrentNotificationId(notificationId);

    executionControllerRef.current = new AbortController();

    try {
      let completed = 0;
      let failed = 0;

      for (let i = 0; i < blocks.length; i++) {
        if (executionControllerRef.current.signal.aborted) {
          break;
        }

        while (isPaused && !executionControllerRef.current.signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (executionControllerRef.current.signal.aborted) {
          break;
        }

        const block = blocks[i];
        if (!isValidCQLBlock(block)) {
          console.error(`Block ${i} is invalid:`, block);
          failed++;
          continue;
        }
        const { block: parameterizedBlock, parameters } =
          convertBlockToParameterized(block);

        try {
          const response = await fetch(
            `${API_BASE_URL}/api/cql/execute-block`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                block: parameterizedBlock, 
                index: i,
                total: totalBlocks,
                parameters: parameters, 
              }),
              signal: executionControllerRef.current.signal,
            }
          );

          if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(`Block ${i} failed`);
          }

          completed++;
        } catch (error) {
          if (error.name === "AbortError") {
            break;
          }
          failed++;
          console.error(`Block error ${i}:`, error);

          if (parameters && Object.keys(parameters).length > 0) {
            console.log("Parameters:", parameters);
          }
        }

        const progress = Math.round(((completed + failed) / totalBlocks) * 100);

        setExecutionStats({
          totalBlocks,
          completedBlocks: completed,
          failedBlocks: failed,
          progress,
        });

        updateNotification(notificationId, {
          progress,
          description: `Processing block ${
            i + 1
          }/${totalBlocks}... (${completed} sucess, ${failed} failures)`,
        });

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      setIsExecuting(false);

      if (executionControllerRef.current.signal.aborted) {
        updateNotification(notificationId, {
          type: "warning",
          message: "Execution interrupted",
          description: `Execution interrupted by user. ${completed}/${totalBlocks} processed blocks.`,
          duration: 5,
        });
      } else {
        setExecutionResult({
          success: true,
          stats: {
            totalBlocks,
            completedBlocks: completed,
            failedBlocks: failed,
            successRate: Math.round((completed / totalBlocks) * 100),
          },
        });

        updateNotification(notificationId, {
          type: "success",
          message: "Execution completed",
          description: `${completed}/${totalBlocks} blocks executed successfully`,
          duration: 5,
        });
      }
    } catch (error) {
      console.error("Fexecution failure:", error);
      setIsExecuting(false);

      if (currentNotificationId) {
        updateNotification(currentNotificationId, {
          type: "error",
          message: "Execution error",
          description: error.message,
          duration: 5,
        });
      }
    } finally {
      setCurrentNotificationId(null);
    }
  };

  const isValidCQLBlock = (block) => {
    if (!block || typeof block !== 'string') return false;
    
    if (block.includes('CREATE')) {
      const openParens = (block.match(/\(/g) || []).length;
      const closeParens = (block.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        console.warn("Unbalanced parentheses in the block:", block);
        return false;
      }
      
      if (!block.match(/CREATE\s+\([^)]+\)/)) {
        console.warn("Estrutura CREATE inválida no bloco:", block);
        return false;
      }
    }
    
    if (!block.endsWith(';')) {
      console.warn("Block does not end with semicolon:", block);
      return false;
    }
    
    return true;
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const stopExecution = () => {
    if (executionControllerRef.current) {
      executionControllerRef.current.abort();
      executionControllerRef.current = new AbortController();
    }
    setIsExecuting(false);
    setIsPaused(false);
  };

  const handleFileUpload = async (info) => {
    const { file } = info;

    if (file.status === "uploading") {
      setIsUploading(true);
      setUploadProgress(0);
      return;
    }

    if (file.status === "done") {
      setIsUploading(false);
      setUploadProgress(100);

      setFileName(file.name);
      setFileContent(file.response?.content || "");

      message.success(`${file.name} successfully loaded!`);
      setTimeout(() => setUploadProgress(0), 2000);
    } else if (file.status === "error") {
      setIsUploading(false);
      setUploadProgress(0);
      message.error(`${file.name} upload failed.`);
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
    setExecutionResult(null);
    stopExecution();
  };

  const downloadScript = () => {
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "script.cql";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          <span>CQL Script Executor</span>
        </Space>
      }
      style={{ width: "100%" }}
      extra={
        <Button type="primary" onClick={handleNavigateToNeo4jViewer}>
          Neo4j Viewer
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div>

          {isUploading && (
            <div style={{ marginTop: "8px" }}>
              <Progress percent={uploadProgress} status="active" />
              <Text type="secondary">
                Sending file... {uploadProgress}%
              </Text>
            </div>
          )}

          {fileContent && !isUploading && (
            <Alert
              message={
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text strong>{fileName}</Text>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {fileContent.length} characters,{" "}
                    {fileContent.split("\n").length} lines
                  </Text>
                </Space>
              }
              type="info"
              showIcon
              style={{ marginTop: "8px" }}
              action={
                <Space>
                  {/* <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={downloadScript}
                    disabled={!fileContent || isExecuting}
                  >
                    Download
                  </Button>
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={clearSelection}
                    disabled={isExecuting}
                  >
                    Limpar
                  </Button> */}
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={executeCQLByBlocks}
                    loading={isExecuting}
                    disabled={!fileContent || isUploading}
                  >
                    Upload
                  </Button>
                </Space>
              }
            />
          )}
        </div>

        {fileContent && !isUploading && (
          <Card
            size="small"
            title="Script Preview"
            style={{ marginTop: "16px" }}
          >
            <pre
              style={{
                maxHeight: "200px",
                overflow: "auto",
                fontSize: "12px",
                backgroundColor: "#f5f5f5",
                padding: "8px",
                borderRadius: "4px",
              }}
            >
              {fileContent}
            </pre>
          </Card>
        )}

        {isExecuting && (
          <Card size="small" title="Execution in Progress">
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
                    title="Total Blocks"
                    value={executionStats.totalBlocks}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Complete"
                    value={executionStats.completedBlocks}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Failures"
                    value={executionStats.failedBlocks}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Progress"
                    value={`${executionStats.progress}%`}
                  />
                </Col>
              </Row>

              <Space>
                {/* <Button
                  icon={
                    isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />
                  }
                  onClick={togglePause}
                >
                  {isPaused ? "Continuar" : "Pausar"}
                </Button> */}
                <Button danger onClick={stopExecution}>
                  Stop Execution
                </Button>
              </Space>
            </Space>
          </Card>
        )}

        {executionResult && (
          <div>
            <Title level={5}>Execution Result:</Title>
            {executionResult.error ? (
              <Alert
                message="Execution Error"
                description={executionResult.error}
                type="error"
                showIcon
              />
            ) : (
              <Alert
                message="Successful Execution"
                description={
                  <div>
                    <p>Script executed successfully!</p>
                    {executionResult.stats && (
                      <div>
                        <p>Statistics:</p>
                        <pre
                          style={{
                            fontSize: "12px",
                            maxHeight: "200px",
                            overflow: "auto",
                          }}
                        >
                          {JSON.stringify(executionResult.stats, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                }
                type="success"
                showIcon
              />
            )}
          </div>
        )}
      </Space>
    </Card>
  );
};

export default CQLExecutor;