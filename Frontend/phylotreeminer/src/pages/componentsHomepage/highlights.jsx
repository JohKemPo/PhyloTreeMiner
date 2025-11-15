import React from "react";
import { Row, Col, Card, Typography, Space, Divider } from "antd";
import {
  BranchesOutlined,
  AlignLeftOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ClusterOutlined,
  CodeOutlined,
  BarChartOutlined,
  FunctionOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

const Highlights = () => {
  const features = [
    {
      icon: <BranchesOutlined style={{ fontSize: "24px", color: "#1890ff" }}/>,
      title: "Visual Insights with Neo4j",
      description:
        "Graph-based visualization powered by Neo4j reveals hidden biological relationships between taxa, enabling the discovery of complex evolutionary patterns that are difficult to capture in tabular views.",
    },
    {
      icon: (
        <AlignLeftOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
      ),
      title: "Alignment Viewer",
      description:
        "An advanced visualization tool for multiple sequence alignments, highlighting conservation patterns, gap distributions, and regions of biological significance to support comparative and evolutionary analysis.",
    },
    {
      icon: <FileTextOutlined style={{ fontSize: "24px", color: "#1890ff" }} />,
      title: "Multi-format Support",
      description:
        "Seamlessly handles common bioinformatics standards such as phylogenetic trees (.nexus, .newick) and sequence alignments (.fasta, .clustal), ensuring smooth integration into existing research workflows.",
    },
    {
      icon: (
        <ExperimentOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
      ),
      title: "Data correlation with the NCBI",
      description:
        <p>Real-time integration with <a href="" target="_blank">NCBI</a> databases enhances analyses with taxonomic metadata and links to relevant publications, providing deeper biological context to sequence-based studies.</p>,
    },
    {
      icon: <ClusterOutlined style={{ fontSize: "24px", color: "#1890ff" }} />,
      title: "Interactive Tree Exploration",
      description:
        "Phylogenetic trees that allow intuitive exploration of evolutionary relationships, with interactive node selection to investigate clades, divergences, and lineage-specific patterns.",
    },
    {
      icon: <CodeOutlined style={{ fontSize: "24px", color: "#1890ff" }} />,
      title: "Containerized Workflow with Docker",
      description:
        "Delivered in a reproducible Docker environment, ensuring consistent analyses, facilitating collaboration, and supporting long-term scientific reproducibility across different systems.",
    },
    {
      icon: <BarChartOutlined style={{ fontSize: "24px", color: "#1890ff" }} />,
      title: "Epidemiological Data Integration with OWID",
      description:
        <p>Connect phylogenetic analyses with epidemiological data from <a href="https://ourworldindata.org/" target="_balnk">Our World in Data (OWID)</a>, enabling correlation of evolutionary patterns with public health trends, disease incidence, and real-time population metrics.</p>,
    },
    {
      icon: <FunctionOutlined style={{ fontSize: "24px", color: "#1890ff" }} />,
      title: "Pattern Mining with FPMax",
      description: <p>Identify significant evolutionary patterns using the <a href="http://ceur-ws.org/Vol-90/grahne.pdf" target="_balnk">FPMax</a> algorithm for maximal frequent pattern mining, revealing sets of genetic characteristics that co-occur in specific lineages.</p>
    },
  ];

  return (
    <div style={{ padding: "40px 0", backgroundColor: "white"}}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <Title level={2} style={{ color: "#262626", marginBottom: 16 }}>
          Workflow Highlights
        </Title>
        <Paragraph
          style={{
            fontSize: "16px",
            color: "#8c8c8c",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          Explore the key features that make PhyloTreeMiner the ideal tool for
          your analyses.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]} justify="center" style={{paddingRight:'64px', paddingLeft:'64px'}}>
        {features.map((feature, index) => (
          <Col key={index} xs={24} sm={12} md={12} lg={8} xl={6}>
            <Card
              style={{
                height: "100%",
                border: "1px solid #f0f0f0",
                borderRadius: "8px",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.03)",
                transition: "all 0.3s ease",
              }}
              styles={{
                padding: "24px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
              hoverable
            >
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <div>{feature.icon}</div>
                <div style={{ flex: 1 }}>
                  <Title
                    level={4}
                    style={{
                      color: "#262626",
                      marginBottom: 12,
                      fontSize: "16px",
                    }}
                  >
                    {feature.title}
                  </Title>
                  <Paragraph
                    style={{ color: "#595959", margin: 0, lineHeight: "1.6" }}
                  >
                    {feature.description}
                  </Paragraph>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Highlights;
