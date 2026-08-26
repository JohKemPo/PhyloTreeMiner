import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Select,
  Input,
  Alert,
  Spin,
  Segmented,
} from "antd";
import {
  FilterOutlined,
  AppstoreOutlined,
  TableOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

import { STATUS_MAP, VALID_STATUSES } from "../../constants/executionStatus";
import ProjectsCardsView from "./projectsCardsView";
import ProjectsTableView from "./projectsTableView";
import { useNavigate } from "react-router-dom";

const ProjectGallery = ({ onProjectSelect }) => {
  const [projects, setProjects] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");

  const navigate = useNavigate();

  const socketsRef = useRef({});

  const API_BASE_URL = "http://localhost:8000";
  const WS_BASE_URL = "ws://localhost:8000";

  const fetchJobsData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setIsLoading(true);
    try {
      const [projectsRes, statusRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects`),
        fetch(`${API_BASE_URL}/projects/status`),
      ]);
      if (!projectsRes.ok || !statusRes.ok)
        throw new Error("Failed to load job data.");

      let projectsData = await projectsRes.json();
      const statusData = await statusRes.json();


      if (projectsData.length > 0) {
        const projectNames = projectsData.map((p) => p.name);
        const detailsRes = await fetch(`${API_BASE_URL}/projects/details`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectNames),
        });

        const detailsData = detailsRes.ok ? await detailsRes.json() : {};

        projectsData = projectsData.map((p) => ({
          ...p,
          // D22 — o padrão de quem não tem status é "unknown", não "never_run".
          // Coagir o desconhecido para um estado concreto foi o defeito: o
          // backend devolvia "idle" no `else` do parse e a interface o exibia
          // como "Waiting", de modo que uma execução morta no meio ficava
          // indistinguível de uma que nunca começou.
          status: statusData[p.name] || "unknown",
          details: detailsData[p.name] || {
            input_file: null,
            current_step: null,
            progress: null,
            trees_built: 0,
          },
        }));

        projectsData = projectsData.map((p) => ({
          ...p,
          status: VALID_STATUSES.includes(p.status) ? p.status : "unknown",
        }));
      }

      setProjects(projectsData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!isBackgroundRefresh) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobsData();
  }, [fetchJobsData]);

  useEffect(() => {
    const connect = (projectName) => {
      if (
        socketsRef.current[projectName] &&
        socketsRef.current[projectName].readyState < 2
      ) {
        return;
      }

      // console.log(`Conectando ao WebSocket para o projeto: ${projectName}`);
      const socket = new WebSocket(`${WS_BASE_URL}/ws/progress/${projectName}`);
      socketsRef.current[projectName] = socket;

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "tqdm_update") {
          setProgressData((prevData) => ({
            ...prevData,
            [projectName]: data.payload.percentage,
          }));
        }

        if (
          data.type === "workflow_complete" ||
          data.type === "workflow_failed"
        ) {
          // console.log(`Workflow para ${projectName} finalizado. Atualizando status.`);
          fetchJobsData();
          setProgressData((prevData) => {
            const newData = { ...prevData };
            delete newData[projectName];
            return newData;
          });
          socket.close();
        }
        // console.log(`progresso do projeto ${projectName} -> ${data.payload.percentage}`);
      };

      socket.onclose = () => {
        // console.log(`WebSocket para ${projectName} desconectado.`);
        delete socketsRef.current[projectName];
      };

      socket.onerror = (err) => {
        console.error(`Erro no WebSocket para ${projectName}:`, err);
        socket.close();
      };
    };

    projects.forEach((project) => {
      if (project.status === "running") {
        connect(project.name);
      }
    });

    return () => {
      // console.log("Desmontando ProjectGallery, fechando todos os WebSockets.");
      Object.values(socketsRef.current).forEach((socket) => {
        if (socket.readyState === 1) {
          socket.close();
        }
      });
      socketsRef.current = {};
    };
  }, [projects, fetchJobsData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      // console.log("Atualizando status dos jobs...");
      fetchJobsData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchJobsData]);

  const statusMap = STATUS_MAP;

  const filteredProjects = projects
    .map((p) => ({
      ...p,
      // Durante a execução o WebSocket manda o percentual; fora dela, vale o
      // que o backend calculou — que é `null` quando indeterminado. `|| 0`
      // aqui transformava "não sei" em "0%", que era metade de D22.
      progress: progressData[p.name] ?? p.details?.progress ?? null,
    }))
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (statusFilter === "all" || p.status === statusFilter)
    );

  return (
    <div>
      <Title level={3}>Recent Projects</Title>
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col flex="auto">
              <Search
                placeholder="Search by project name..."
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
              />
            </Col>
            <Col>
              <Space>
                <FilterOutlined />
                <Select
                  defaultValue="all"
                  style={{ width: 150 }}
                  onChange={(value) => setStatusFilter(value)}
                >
                  <Option value="all">Todos</Option>
                  {VALID_STATUSES.map((estado) => (
                    <Option key={estado} value={estado}>
                      {STATUS_MAP[estado].text}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col>
              <Segmented
                options={[
                  {
                    label: "Table view",
                    value: "table",
                    icon: <TableOutlined />,
                  },
                  {
                    label: "Cards view",
                    value: "cards",
                    icon: <AppstoreOutlined />,
                  },
                ]}
                value={viewMode}
                onChange={setViewMode}
              />
            </Col>
            <Button
              color="default"
              variant="dashed"
              icon={<PlusCircleOutlined />}
              onClick={() => {
                navigate("/workflow");
              }}
            >
              Create Project
            </Button>
          </Row>
        </Space>
      </Card>
      {isLoading && (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      )}
      {error && (
        <Alert message="Erro" description={error} type="error" showIcon />
      )}
      {!isLoading &&
        !error &&
        (viewMode === "cards" ? (
          <ProjectsCardsView
            projects={filteredProjects}
            statusMap={statusMap}
            onProjectSelect={onProjectSelect}
            progressData={progressData}
          />
        ) : (
          <ProjectsTableView
            projects={filteredProjects}
            statusMap={statusMap}
            onProjectSelect={onProjectSelect}
            progressData={progressData}
          />
        ))}
    </div>
  );
};

export default ProjectGallery;
