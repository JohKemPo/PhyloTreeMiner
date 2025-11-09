import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Empty,
  Progress,
} from "antd";
import { LoadingOutlined, FileOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const ProjectsCardsView = ({ projects, statusMap, onProjectSelect }) => {
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

  const progress_percent = {
    "Construction of distance matrix.": 14.0,
    "Tree Construction with parsimony method.": 24.8,
    "Tree Construction with distance matrix.": 40.0,
    "Construction of Subtrees.": 80.5,
    "Frequent subtree mining.": 95.2,
    "Completed successfully!": 100,
  };

  const convert_time = (totalSeconds) => {
    if (totalSeconds === null || totalSeconds === undefined) {
      return "—";
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const format = (num) => String(num).padStart(2, "0");

    return `${format(hours)}:${format(minutes)}:${format(seconds)}`;
  };

  return (
    <Row gutter={[12, 12]}>
      {projects.length > 0 ? (
        projects.map((job) => (
          <Col xs={8} sm={6} lg={6} key={job.name}>
            <Card
              hoverable
              title={<Text ellipsis={{ tooltip: job.name }}>{job.name}</Text>}
              extra={
                <Tag
                  color={statusMap[job.status]?.color}
                  icon={statusMap[job.status]?.icon}
                >
                  {statusMap[job.status]?.text}
                </Tag>
              }
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <Row justify="space-between">
                  <Text type="secondary">Started</Text>
                  <Text>
                    {new Date(job.last_modified).toLocaleString("pt-BR")}
                  </Text>
                </Row>
                <Row justify="space-between">
                  <Text type="secondary">Duration</Text>
                  <Text>{convert_time(job.duration) || "--"}</Text>
                </Row>
                <Row justify="space-between">
                  <Text type="secondary">Input</Text>
                  <Text ellipsis={{ tooltip: job.details?.input_file }}>
                    <FileOutlined style={{ marginRight: 4 }} />
                    {job.details?.input_file || "..."}
                  </Text>
                </Row>
                <Row justify="space-between">
                  <Text type="secondary">Step</Text>
                  <Text>{job.details?.current_step || "..."}</Text>
                </Row>
                {job.status === "running" ? (
                  <Progress
                    percent={progress_percent[job.details?.current_step]}
                    status
                  />
                ) : job.status === "completed" ? (
                  <Progress percent={100} status />
                ) : job.status === "failed" ? (
                  <Progress percent={100} status="exception" />
                ) : (
                  <Text type="secondary">
                    Searching <LoadingOutlined />
                  </Text>
                )}
              </Space>
              <Button
                type="primary"
                ghost
                block
                style={{ marginTop: 24 }}
                onClick={() => onProjectSelect(job.name)}
              >
                See Details
              </Button>
            </Card>
          </Col>
        ))
      ) : (
        <Col span={24} style={{ textAlign: "center", padding: 50 }}>
          <Empty description="No projects found with applied filters." />
        </Col>
      )}
    </Row>
  );
};

export default ProjectsCardsView;
