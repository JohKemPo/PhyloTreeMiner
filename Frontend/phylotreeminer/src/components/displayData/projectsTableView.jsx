import { useEffect, useState } from "react";
import {
  Typography,
  Button,
  Space,
  Tag,
  Table,
  Progress,
  Dropdown,
  Menu,
  Modal,
  Empty,
  Tooltip,
  message,
} from "antd";

import {
  MoreOutlined,
  FileOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  AuditOutlined,
  ExclamationCircleFilled,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { formatarDuracao } from "../../constants/executionStatus";

const { Text } = Typography;
const API_BASE_URL = "http://localhost:8000";

const ProjectsTableView = ({
  projects,
  statusMap,
  onProjectSelect,
  progressData = {},
  onRefresh,
}) => {
  const [rerunLoading, setRerunLoading] = useState({});
  const [deleteLoading, setDeleteLoading] = useState({});

  const navigate = useNavigate();
  if (projects.length === 0) {
    return (
      <Empty
        description={
          <Typography.Text>
            No projects found. Start a new project.
          </Typography.Text>
        }
      >
        <Button
          type="primary"
          onClick={() => {
            navigate("/workflow");
          }}
        >
          Create Now
        </Button>
      </Empty>
    );
  }

  const handleRerunProject = async (projectName) => {
    try {
      const checkResponse = await fetch(
        `http://localhost:8000/projects/${projectName}/can-rerun`,
      );
      const checkData = await checkResponse.json();

      if (!checkData.can_rerun) {
        message.warning(`Não é possível reexecutar: ${checkData.reason}`);
        return;
      }
    } catch (error) {
      message.error("Erro ao verificar projeto");
      return;
    }
    setRerunLoading((prev) => ({ ...prev, [projectName]: true }));

    try {
      const response = await fetch(
        `http://localhost:8000/projects/${projectName}/rerun`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        message.success(`Projeto ${projectName} está sendo reexecutado!`);
        onRefresh();
      } else {
        const errorData = await response.json();
        message.error(`Erro ao reexecutar: ${errorData.detail}`);
      }
    } catch (error) {
      message.error("Erro de conexão ao reexecutar projeto");
    } finally {
      setRerunLoading((prev) => ({ ...prev, [projectName]: false }));
    }
  };

  const handleDeleteProject = (projectName) => {
    Modal.confirm({
      title: "Delete project permanently?",
      icon: <ExclamationCircleFilled style={{ color: "#ff4d4f" }} />,
      content: (
        <>
          <p>
            This removes <Text strong>"{projectName}"</Text> and everything in{" "}
            <Text code>out/</Text> — trees, alignments, mined metadata, and
            the execution manifest.
          </p>
          <p>
            <Text type="danger">This action cannot be undone.</Text>
          </p>
        </>
      ),
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        setDeleteLoading((prev) => ({ ...prev, [projectName]: true }));
        try {
          const response = await fetch(
            `${API_BASE_URL}/projects/${projectName}`,
            { method: "DELETE" },
          );
          if (response.ok) {
            message.success(`Project "${projectName}" deleted.`);
            onRefresh?.();
          } else {
            const errorData = await response.json().catch(() => ({}));
            message.error(
              errorData.detail || `Error ${response.status} while deleting project`,
            );
          }
        } catch (error) {
          message.error("Connection error while deleting project");
        } finally {
          setDeleteLoading((prev) => ({ ...prev, [projectName]: false }));
        }
      },
    });
  };


  const columns = [
    {
      title: "Project Name",
      dataIndex: "name",
      key: "name",
      width: 400,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <a onClick={() => onProjectSelect(record.name)}>{text}</a>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 180,
      filters: [
        { text: "All", value: "all" },
        ...Object.entries(statusMap).map(([key, value]) => ({
          text: value.text,
          value: key,
        })),
      ],
      onFilter: (value, record) =>
        value === "all" ? true : record.status === value,
      render: (status) => {
        const statusInfo = statusMap[status] || {
          color: "default",
          icon: null,
          text: status,
        };
        return (
          <Tag color={statusInfo.color} icon={statusInfo.icon}>
            {statusInfo.text}
          </Tag>
        );
      },
    },
    {
      title: "Progress",
      key: "progress",
      render: (record) => {
        // D22 — o percentual era 0 em 21 de 21 projetos, e o ramo final dizia
        // "Loading" para projetos que não estavam carregando nada. Percentual
        // desconhecido é `null`, e o que se mostra no lugar é a contagem de
        // árvores, que é um número que existe de verdade.
        const pct = progressData[record.name] ?? record.details?.progress ?? null;
        const arvores = record.details?.trees_built ?? 0;

        if (record.status === "running") {
          return pct === null ? (
            <Progress percent={100} status="active" showInfo={false} />
          ) : (
            <Progress percent={pct} status="active" />
          );
        }
        if (record.status === "completed") {
          return <Progress percent={100} status="success" />;
        }
        if (record.status === "failed") {
          return <Progress percent={100} status="exception" />;
        }
        if (record.status === "interrupted") {
          return (
            <Text type="warning">
              {arvores > 0 ? `${arvores} árvore(s) antes de parar` : "parou sem gerar árvore"}
            </Text>
          );
        }
        return <Text type="secondary">—</Text>;
      },
    },
    {
      title: "Last Modified",
      dataIndex: "last_modified",
      key: "last_modified",
      sorter: (a, b) => new Date(a.last_modified) - new Date(b.last_modified),
      render: (date) => new Date(date).toLocaleString("pt-BR"),
    },
    {
      title: "Duration",
      dataIndex: "duration",
      key: "duration",
      width: 150,
      sorter: (a, b) => (a.duration ?? -1) - (b.duration ?? -1),
      render: (totalSeconds, record) => {
        // Duração desconhecida traz o motivo junto: o traço mudo não distinguia
        // "log sem carimbo de tempo" de "nunca executado" (D22).
        if (totalSeconds === null || totalSeconds === undefined) {
          return (
            <Tooltip title={record.duration_note || "duração indeterminada"}>
              <Text type="secondary">—</Text>
            </Tooltip>
          );
        }
        const rotulo = formatarDuracao(totalSeconds);
        // `log` significa reconstruída por leitura; `manifesto`, declarada pelo
        // pipeline. Quem for publicar um tempo precisa saber a diferença.
        return record.duration_source === "manifesto" ? (
          <Tooltip title={`Declarada pelo manifesto (run ${record.run_id?.slice(0, 12) || "?"})`}>
            <Text>{rotulo}</Text>
          </Tooltip>
        ) : (
          <Tooltip title="Reconstruída a partir do log, não declarada pelo pipeline">
            <Text type="secondary">{rotulo}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Input",
      key: "input",
      ellipsis: {
        showTitle: false,
      },
      render: (_, record) => {
        const text = record.details?.input_file || "...";
        const truncated =
          text.length > 10 ? `${text.slice(0, 10)}...` : text;
        return (
          <Tooltip title={text}>
            <div className="prompt-cell">
              <FileOutlined style={{ marginRight: 8 }} />
              {truncated}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: "Current Stage",
      key: "step",
      render: (_, record) => {
        const text = record.details?.current_step || "...";
        const truncated =
          text.length > 25 ? `${text.slice(0, 25)}...` : text;
        return (
          <Tooltip title={text}>
            <div className="prompt-cell">
              <FileOutlined style={{ marginRight: 8 }} />
              {truncated}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: "Actions",
      key: "actions",
      render: (record) => (
        <Space>
          <Button
            type="primary"
            ghost
            onClick={() => onProjectSelect(record.name)}
          >
            Details
          </Button>

          {/* <Button 
            type="default" 
            icon={<PlayCircleOutlined />}
            loading={rerunLoading[record.name]}
            onClick={() => handleRerunProject(record.name)}
            disabled={record.status === 'running'}
          >
            Re-run
          </Button> */}

          <Dropdown
            overlay={
              <Menu>
                <Menu.Item
                  key="rerun"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleRerunProject(record.name)}
                  disabled={
                    record.status === "running" || rerunLoading[record.name]
                  }
                >
                  Re-run Project
                </Menu.Item>
                <Menu.Item
                  key="provenance"
                  icon={<AuditOutlined />}
                  onClick={() =>
                    navigate(
                      `/provenance?project=${encodeURIComponent(record.name)}`,
                    )
                  }
                >
                  Provenance
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  key="delete"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteProject(record.name)}
                  danger
                  disabled={
                    record.status === "running" || deleteLoading[record.name]
                  }
                >
                  Delete Project
                </Menu.Item>
              </Menu>
            }
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={projects}
      rowKey="name"
      pagination={{ pageSize: 10 }}
    />
  );
};

export default ProjectsTableView;
