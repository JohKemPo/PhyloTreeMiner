import React from "react";
import { Timeline, Typography, ConfigProvider, theme } from "antd";
import {
  DatabaseOutlined,
  SafetyCertificateOutlined,
  AlignLeftOutlined,
  ApartmentOutlined,
  ShareAltOutlined,
  NodeExpandOutlined,
  DeploymentUnitOutlined,
  BarChartOutlined,
  BookOutlined,
  ApiOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const timelineData = [
  {
    title: "Data Preprocessing",
    description: "Python script cleans and formats input strings.",
    color: "#4A90E2",
    icon: <DatabaseOutlined />,
  },
  {
    title: "Sequence Validation",
    description: "Biopython checks the integrity and format of sequences.",
    color: "#50E3C2",
    icon: <SafetyCertificateOutlined />,
  },
  {
    title: "Multiple Sequence Alignment",
    description: "Biopython, ClustalO, or MAFFT aligns the sequences.",
    color: "#7ED321",
    icon: <AlignLeftOutlined />,
  },
  {
    title: "Evolutionary Model Selection",
    description: "ModelTest or Substitution Models.",
    color: "#B8E986",
    icon: <ApartmentOutlined />,
  },
  {
    title: "Tree Inference",
    description:
      "Biopython, UPGMA, Neighbor-Joining, Maximum Parsimony, and Maximum Likelihood.",
    color: "#F8E71C",
    icon: <ShareAltOutlined />,
  },
  {
    title: "Subtree Generation",
    description: "Extraction of possible subtrees.",
    color: "#F5A623",
    icon: <NodeExpandOutlined />,
  },
  {
    title: "Mapping the Subtrees",
    description: "Mapping subtrees to transactions and items.",
    color: "#D0021B",
    icon: <DeploymentUnitOutlined />,
  },
  {
    title: "Subtree Frequency Calculation",
    description: "Frequent pattern mining of each subtree with FPMAX.",
    color: "#BD10E0",
    icon: <BarChartOutlined />,
  },
  {
    title: "PubMed Metadata Retrieval",
    description:
      "Aggregation of metadata from literature associated with clades/taxa.",
    color: "#9013FE",
    icon: <BookOutlined />,
  },
  {
    title: "Neo4j Integration",
    description: "Knowledge and results representation in Neo4j database.",
    color: "#673AB7",
    icon: <ApiOutlined />,
  },
];

const PhyloDIagramWokflow = () => {
  const items = timelineData.map((step) => ({
    color: step.color,
    dot: React.cloneElement(step.icon, {
      style: { fontSize: "20px", color: step.color },
    }),
    children: (
      <div style={{ marginBottom: "24px" }}>
        <Text
          strong
          style={{
            color: step.color,
            display: "block",
            fontSize: "16px",
            marginBottom: "4px",
          }}
        >
          {step.title}
        </Text>
        <Text style={{ color: "#000000" }}>{step.description}</Text>
      </div>
    ),
  }));

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        components: {
          Timeline: {
            tailWidth: 2,
          },
        },
      }}
    >
      <div style={{ padding: "40px", minHeight: "100vh" }}>
        <Timeline orientation="horizontal" mode="alternate" items={items} />
      </div>
    </ConfigProvider>
  );
};

export default PhyloDIagramWokflow;
