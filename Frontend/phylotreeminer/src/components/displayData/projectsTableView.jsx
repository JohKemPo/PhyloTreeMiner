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
  Empty,
  message,
} from "antd";
import {
  MoreOutlined,
  LoadingOutlined,
  FileOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const ProjectsTableView = ({
  projects,
  statusMap,
  onProjectSelect,
  progressData = {},
}) => {
  const [rerunLoading, setRerunLoading] = useState({});

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
        `http://localhost:8000/projects/${projectName}/can-rerun`
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
        }
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
      title: "Confirmar exclusão",
      content: `Tem certeza que deseja excluir o projeto "${projectName}"? Esta ação não pode ser desfeita.`,
      okText: "Excluir",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          message.info("Funcionalidade de exclusão em desenvolvimento");
        } catch (error) {
          message.error("Erro ao excluir projeto");
        }
      },
    });
  };

  const progress_percent = {
    "Construction of distance matrix.": 14.0,
    "Tree Construction with parsimony method.": 24.8,
    "Tree Construction with distance matrix.": 40.0,
    "Construction of Subtrees.": 80.5,
    "Frequent subtree mining.": 95.2,
    "Completed successfully!": 100,

    // "STEP: Construction of distance matrix.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with parsimony method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with IQ-TREE method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with FastTree method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with RAxML-NG method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with MrBayes method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Construction of distance matrix.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with parsimony method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Construction of distance matrix.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with parsimony method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with IQ-TREE method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with FastTree method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with RAxML-NG method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with MrBayes method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Construction of distance matrix.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Tree Construction with parsimony method.": 0,
    // "STEP: saving the tree image.": 0,
    // "STEP: Construction of Subtrees.": 0,
    // "STEP: Frequent subtree mining.": 0,
    // "STEP: Completed successfully!": 0,
  };

  const columns = [
    {
      title: "Project Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <a onClick={() => onProjectSelect(record.name)}>{text}</a>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
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
        const currentProgress = progressData[record.name] || 0;

        if (record.status === "running") {
          return <Progress percent={currentProgress} status="active" />;
        } else if (record.status === "completed") {
          return <Progress percent={100} status="success" />;
        } else if (record.status === "failed") {
          return <Progress percent={100} status="exception" />;
        } else {
          return (
            <Text type="secondary">
              Loading <LoadingOutlined />
            </Text>
          );
        }
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
      sorter: (a, b) => (a.duration || 0) - (b.duration || 0),
      render: (totalSeconds) => {
        if (totalSeconds === null || totalSeconds === undefined) {
          return "—";
        }

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const format = (num) => String(num).padStart(2, "0");

        return `${format(hours)}:${format(minutes)}:${format(seconds)}`;
      },
    },
    {
      title: "Input",
      key: "input",
      render: (_, record) => (
        <Text>
          <FileOutlined style={{ marginRight: 8 }} />
          {record.details?.input_file || "..."}
        </Text>
      ),
    },
    {
      title: "Current Stage",
      key: "step",
      render: (_, record) => (
        <Text>{record.details?.current_step || "..."}</Text>
      ),
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
                  key="delete"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteProject(record.name)}
                  danger
                  disabled
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
