import React, { useState } from "react";
import {
  Layout,
  Menu,
  Typography,
  Divider,
  Input,
  List,
  Breadcrumb,
  Row,
  Col,
  Space,
  Card,
  Alert,
  Tag,
  Button,
  Steps
} from "antd";
import {
  HomeOutlined,
  FileTextOutlined,
  BookOutlined,
  RocketOutlined,
  AppstoreOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import Logo from '../../pages/componentsHomepage/logo'
import { colors } from "../../themes";

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const PhyloTreeMinerDocs = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentSection, setCurrentSection] = useState("home");
  const [currentSubsection, setCurrentSubsection] = useState(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState([
    "Home",
    "PhyloTreeMiner-Docs",
  ]);

  // Estrutura completa da documentação

  const documentationStructure = {
    home: {
      title: "PhyloTreeMiner Docs",
      icon: <HomeOutlined />,
      content: (
        <div>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
                className="logo-container"
                style={{
                  height: "94px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 10px",
                  backgroundColor: colors.white,
                }}
              >
                <Logo size="50px" />
                {!collapsed && (
                  <Title
                    level={8}
                    style={{
                      color: colors.primary,
                      marginBottom: 0,
                      marginLeft: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    PhyloTreeMiner
                  </Title>
                )}
              </div>
            <Title level={3} type="secondary">
              Parallel Identification of Frequent Subtrees in Phylogenetic Analyses
            </Title>
          </div>

          <Card
            style={{
              marginBottom: 24,
              borderLeft: "4px solid #1890ff",
              backgroundColor: "#f6ffed",
            }}
          >
            <Paragraph style={{ fontSize: "16px", margin: 0 }}>
              <strong>An advanced computational platform</strong> for
              automating large-scale phylogenetic analysis, providing
              a systematic, parallel, and reproducible solution to identify
              robust evolutionary patterns.
            </Paragraph>
          </Card>

          <Divider />

          <Title level={2}>Main Objective</Title>
          <Paragraph>
            Facing the{" "}
            <Text strong>exponential growth of biological data</Text> and the
            capacity to generate increasingly larger phylogenetic trees, a new
            challenge arises: how to extract reliable knowledge from thousands
            of trees that can be generated from the same dataset.
          </Paragraph>

          <Alert
            message="Paradigm Shift"
            description="PhyloTreeMiner shifts the focus from 'searching for the single correct tree' to 'identifying the most robust and reliable evolutionary relationships'"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Title level={2}>🔍 The Problem: Phylogenetic Uncertainty</Title>

          <Card style={{ marginBottom: 16 }}>
            <Title level={4}>
              Why? The Methodological Choice Challenge
            </Title>
            <Paragraph>
              Building a phylogenetic tree is not a unique process.
              There are multiple philosophies and methods:
            </Paragraph>
            <List
              dataSource={[
                "Maximum Parsimony",
                "Maximum Likelihood",
                "Distance Matrix",
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Text checkable>{item}</Text>
                </List.Item>
              )}
            />
          </Card>

          <Alert
            message="Critical Questions"
            description={
              <List
                size="small"
                dataSource={[
                  "How to extract useful knowledge from methodological variation?",
                  "How to identify reliable evolutionary patterns amidst disagreement?",
                  "Why are traditional consensus trees inadequate?",
                ]}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            }
            type="warning"
            showIcon
          />

          <Divider />

          <Title level={2}>The Solution: Focus on Robustness</Title>

          <Card
            type="inner"
            title="What is Phylogenetic Robustness?"
            style={{ marginBottom: 24 }}
          >
            <Paragraph>
              A pattern (clade) that is consistently identified by methods
              with completely different mathematical and statistical premises
              is, by definition, a pattern of{" "}
              <Text strong>very high confidence</Text>, and not an artifact of a
              single method.
            </Paragraph>
          </Card>

          <Title level={2}>How It Works: The Automated Workflow</Title>

          <List
            itemLayout="vertical"
            dataSource={[
              {
                title: "1. Acquisition and Pre-processing",
                content:
                  "Sequence acquisition (Fasta files or direct NCBI query) with data validation and preparation",
              },
              {
                title: "2. Multiple Sequence Alignment",
                content:
                  "Alignment using different programs (ClustalW, MAFFT) to create the basis for structural comparison",
              },
              {
                title: "3. Tree Inference (The Ensemble)",
                content:
                  "Parallel generation of a robust set of candidate trees using multiple inference methods",
              },
              {
                title: "4. Subtree Generation and Mapping",
                content:
                  "Decomposition of each tree into subtrees with metadata enrichment (country, date, etc.)",
              },
              {
                title: "5. Mining (Frequency Calculation)",
                content:
                  "Comparison of all subtrees using FPMax algorithm to calculate topological pattern frequency",
              },
              {
                title: "6. Knowledge Representation",
                content:
                  "Export to graph database (Neo4j) for interactive visualization and complex queries",
              },
            ]}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta title={item.title} description={item.content} />
              </List.Item>
            )}
          />

          <Divider />

          <Title level={2}>Key Features and Their Importance</Title>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card
                size="small"
                title="Multiple Inference Methodologies"
                style={{ height: "100%" }}
              >
                <Paragraph>
                  <strong>Basis of the methodological "stress test"</strong>.
                  Integrates a comprehensive arsenal including:
                </Paragraph>
                <List
                  size="small"
                  dataSource={[
                    "Distance Methods (NJ, UPGMA)",
                    "Maximum Likelihood (RAxML, IQ-TREE)",
                    "Bayesian Inference (MrBayes)",
                  ]}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card
                size="small"
                title="NCBI Integration"
                style={{ height: "100%" }}
              >
                <Paragraph>
                  <strong>
                    Automated data acquisition and enrichment
                  </strong>
                  . Direct query to NCBI database for:
                </Paragraph>
                <List
                  size="small"
                  dataSource={[
                    "Automating sequence acquisition",
                    "Associating crucial metadata (date, location, gene)",
                    "Transforming abstract patterns into actionable information",
                  ]}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card
                size="small"
                title="FPMax Algorithm"
                style={{ height: "100%" }}
              >
                <Paragraph>
                  <strong>Efficient large-scale mining</strong>. Makes
                  feasible the comparison of thousands of trees and millions of
                  subtrees:
                </Paragraph>
                <List
                  size="small"
                  dataSource={[
                    "High-performance computer science approach",
                    "Solving NP-hard problems",
                    "Analysis completed in reasonable time",
                  ]}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card
                size="small"
                title="OWID Integration"
                style={{ height: "100%" }}
              >
                <Paragraph>
                  <strong>Real-time epidemiological contextualization</strong>
                  . Connects phylogenetic patterns with real-world data:
                </Paragraph>
                <List
                  size="small"
                  dataSource={[
                    "Variant impact validation",
                    "Early warning system",
                    "Intervention monitoring",
                  ]}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          <Title level={2}>Geographical and Temporal Insights</Title>

          <Alert
            message="Transforming Data into Actionable Knowledge"
            description="PhyloTreeMiner not only finds frequent patterns but contextualizes them in space and time, providing deep insights into evolutionary dynamics"
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card size="small" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "24px", marginBottom: 8 }}>🌍</div>
                <Title level={4}>Geographical Analysis</Title>
                <Paragraph>
                  Lineage tracking by region, identification of dispersal
                  routes and evolutionary hotspots
                </Paragraph>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "24px", marginBottom: 8 }}>📅</div>
                <Title level={4}>Temporal Analysis</Title>
                <Paragraph>
                  Monitoring emergence and decline of lineages over
                  time, detecting evolutionary trends
                </Paragraph>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "24px", marginBottom: 8 }}>🔗</div>
                <Title level={4}>Epidemiological Correlation</Title>
                <Paragraph>
                  Integration with public health data to validate biological
                  impact of genetic patterns
                </Paragraph>
              </Card>
            </Col>
          </Row>

          <Divider />

          <Card
            style={{
              backgroundColor: "#fff7e6",
              border: "1px solid #ffd591",
            }}
          >
            <Title level={3}>Why PhyloTreeMiner is Essential?</Title>
            <Paragraph>
              In a world with biological data growing exponentially,
              traditional tools become inadequate. <b><span style={{color:colors.primary}}>PhyloTreeMiner </span></b>
              represents the{" "}
              <Text strong>next generation of phylogenetic analysis</Text>, where
              methodological robustness, computational scalability and
              epidemiological contextualization come together to provide
              reliable and actionable insights for research and public health.
            </Paragraph>
          </Card>
        </div>
      ),
    },
    phylotreeminerWebapp: {
      title: "PhyloTreeMiner WebApp",
      icon: <AppstoreOutlined />,
      count: 4,
      subsections: {
        gettingStarted: {
          title: "Getting Started with the WebApp",
          content: (
            <div>
              <Title level={2}>PhyloTreeMiner WebApp Guide</Title>

              <Alert
                message="Interactive Web Interface"
                description="Configure and execute phylogenetic analyses through an intuitive web interface"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Paragraph>
                The PhyloTreeMiner WebApp provides a user-friendly interface to configure, 
                manage, and execute phylogenetic analysis workflows without needing command-line expertise.
              </Paragraph>

              <Card
                title="🚀 Quick Start"
                style={{ marginBottom: 24 }}
                type="inner"
              >
                <Steps
                  // current={1}
                  labelPlacement="vertical"
                  items={[
                    {description:<p style={{textAlign:'left'}}>Navigate to Workflow Settings to create a new project</p>},
                    {description:<p style={{textAlign:'left'}}>Configure your analysis parameters in three simple steps</p>},
                    {description:<p style={{textAlign:'left'}}>Select your dataset or download from NCBI</p>},
                    {description:<p style={{textAlign:'left'}}>Review and launch your analysis</p>},
                  ]}
                  
                />
              </Card>

              <Title level={3}>Accessing the WebApp</Title>
              <Paragraph>
                To start using the PhyloTreeMiner WebApp, simply access the workflow configuration page:
              </Paragraph>

              <Card style={{ marginBottom: 16 }}>
                <div style={{ textAlign: "center", padding: "16px" }}>
                  <Button 
                    type="primary" 
                    size="large"
                    onClick={() => window.location.href = '/workflow'}
                    icon={<RocketOutlined />}
                  >
                    Go to Workflow Settings
                  </Button>
                  <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                    Or navigate to: <Text code>/workflow</Text> in the sidebar menu
                  </Paragraph>
                </div>
              </Card>
            </div>
          ),
        },
        workflowConfiguration: {
          title: "Workflow Configuration Steps",
          content: (
            <div>
              <Title level={2}>Step-by-Step Workflow Configuration</Title>

              <Alert
                message="Three-Step Configuration Process"
                description="Follow these steps to configure your phylogenetic analysis"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Steps
                items={[
                  {
                    title: "Workflow Configuration",
                    description: "Set the core parameters for tree and subtree construction",
                  },
                  {
                    title: "Dataset Selection",
                    description: "Choose existing data, upload files, or search NCBI",
                  },
                  {
                    title: "Review and Start",
                    description: "Confirm settings and launch the analysis",
                  },
                ]}
              />

              <Divider />

              <Title level={3}>Step 1: Workflow Configuration</Title>

              <Card style={{ marginBottom: 24 }}>
                <Title level={4}>Project Setup</Title>
                <List
                  size="small"
                  dataSource={[
                    "Project Name: Choose a unique identifier for your analysis",
                    "Log File: Automatically generated based on project name and date",
                    "Construction Mode: Select between automatic, manual, or advanced modes",
                  ]}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
              </Card>

              <Card style={{ marginBottom: 24 }}>
                <Title level={4}>Tree Building Settings</Title>
                <Row gutter={[16, 16]}>
                  <Alert
                    message="Large datasets"
                    description="For very large sets of sequences, we suggest selecting the MrBayes and Parsimony methods to be ignored."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                </Row>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card size="small" title="Construction Mode">
                      <List
                        size="small"
                        dataSource={[
                          "Auto: Distance and parsimony methods only",
                          "Manual: Full control over individual methods",
                          "Advanced: All available method combinations",
                        ]}
                        renderItem={(item) => <List.Item>{item}</List.Item>}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="Method Configuration">
                      <List
                        size="small"
                        dataSource={[
                          "Ignore Methods: Optionally exclude specific algorithms",
                          "Threads: Set CPU threads for parallel processing",
                          "Formats: Choose input/output formats (Nexus/Newick)",
                        ]}
                        renderItem={(item) => <List.Item>{item}</List.Item>}
                      />
                    </Card>
                  </Col>
                </Row>
              </Card>

              <Card style={{ marginBottom: 24 }}>
                <Title level={4}>Subtree Construction</Title>
                <List
                  size="small"
                  dataSource={[
                    "Construction Method: Distance or Parsimony based",
                    "Input/Output Formats: Inherited from main tree settings",
                    "Metadata Options: Save subtree metadata and JSON files",
                    "Subtree Mining: Enable pattern discovery in subtrees",
                  ]}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
              </Card>

              <Card style={{ marginBottom: 24 }}>
                <Title level={4}>Subtree Mining (Optional)</Title>
                <Paragraph>
                  When subtree mining is enabled, configure additional parameters:
                </Paragraph>
                <List
                  size="small"
                  dataSource={[
                    "Save FPMax Results: Store frequent pattern mining results",
                    "FPMax Support: Automatic or manual support threshold setting",
                    "Support Value: Manual threshold from 0.1 to 1.0 (if manual mode)",
                  ]}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
              </Card>

              {/* <Alert
                message="Pro Tip"
                description="Use the 'Need Help?' button for interactive guidance through each configuration section"
                type="info"
                showIcon
              /> */}
            </div>
          ),
        },
        datasetManagement: {
          title: "Dataset Selection & Management",
          content: (
            <div>
              <Title level={2}>Dataset Selection and Management</Title>

              <Alert
                message="Multiple Data Sources"
                description="Choose from existing datasets, upload new files, or download from NCBI"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Title level={3}>Step 2: Data Source Options</Title>

              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={8}>
                  <Card
                    title="📁 Existing Datasets"
                    style={{ height: "100%" }}
                    type="inner"
                  >
                    <Paragraph>
                      <strong>Pre-uploaded Data</strong>
                    </Paragraph>
                    <List
                      size="small"
                      dataSource={[
                        "Select from previously uploaded datasets",
                        "Automatic folder detection",
                        "Quick access to processed sequences",
                      ]}
                      renderItem={(item) => <List.Item>{item}</List.Item>}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    title="⬆️ Upload New Data"
                    style={{ height: "100%" }}
                    type="inner"
                  >
                    <Paragraph>
                      <strong>Local File Upload</strong>
                    </Paragraph>
                    <List
                      size="small"
                      dataSource={[
                        "Drag-and-drop interface",
                        "Supports FASTA and ZIP files",
                        "Automatic sequence validation",
                        "Custom dataset naming",
                      ]}
                      renderItem={(item) => <List.Item>{item}</List.Item>}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    title="🌐 NCBI Search (Beta)"
                    style={{ height: "100%" }}
                    type="inner"
                  >
                    <Paragraph>
                      <strong>Direct Database Access</strong>
                    </Paragraph>
                    <List
                      size="small"
                      dataSource={[
                        "Real-time NCBI queries",
                        "Species-specific searches",
                        "Automatic sequence filtering",
                        "Advanced quality controls",
                      ]}
                      renderItem={(item) => <List.Item>{item}</List.Item>}
                    />
                  </Card>
                </Col>
              </Row>

              <Title level={3}>NCBI Search Features</Title>

              <Card style={{ marginBottom: 24 }}>
                <List
                  bordered
                  dataSource={[
                    "Search Query: Use NCBI query syntax for precise results",
                    "Species Selection: Choose from auto-detected species",
                    "Sequence Limits: Set maximum number of sequences to download",
                    "Email Requirement: NCBI requires valid email for queries",
                    "Advanced Filters: Length thresholds, UTR trimming, similarity filtering",
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              <Alert
                message="NCBI Search Tips"
                description={
                  <div>
                    <p>Use <Text strong>[Organism]</Text> for species-specific searches</p>
                    <p>Example: <Text code>"Zika virus[Organism] AND complete genome"</Text></p>
                    <p>Leave 'Save As' empty for automatic naming based on species</p>
                  </div>
                }
                type="warning"
                showIcon
              />
            </div>
          ),
        },
        reviewExecution: {
          title: "Review & Execution",
          content: (
            <div>
              <Title level={2}>Review and Launch Analysis</Title>

              <Alert
                message="Final Verification"
                description="Review all settings before starting the workflow"
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Title level={3}>Step 3: Final Review</Title>

              <Paragraph>
                Before launching your analysis, carefully review all configuration settings:
              </Paragraph>

              <Card style={{ marginBottom: 24 }}>
                <Title level={4}>Configuration Summary</Title>
                <List
                  bordered
                  dataSource={[
                    "Workflow Configuration: Tree and subtree construction parameters",
                    "Dataset Information: Selected data source and file details",
                    "Performance Settings: Thread allocation and resource usage",
                    "Output Settings: File formats and storage locations",
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text strong>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              <Title level={3}>Launching the Workflow</Title>

              <Card style={{ marginBottom: 24 }}>
                <List
                  bordered
                  dataSource={[
                    "Click 'Start Workflow' to begin execution",
                    "Monitor progress in the Projects section",
                    "Access logs and results in the output directory",
                    "Receive completion notifications",
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card
                    size="small"
                    title="📊 Expected Outputs"
                    style={{ height: "100%" }}
                  >
                    <List
                      size="small"
                      dataSource={[
                        "Phylogenetic trees in selected format",
                        "Subtree decompositions and metadata",
                        "FPMax mining results (if enabled)",
                        "Execution logs and performance metrics",
                      ]}
                      renderItem={(item) => <List.Item>{item}</List.Item>}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    size="small"
                    title="⏱️ Execution Time"
                    style={{ height: "100%" }}
                  >
                    <List
                      size="small"
                      dataSource={[
                        "Depends on dataset size and complexity",
                        "Influenced by selected methods and threads",
                        "Larger datasets may take several hours",
                        "Monitor progress in real-time",
                      ]}
                      renderItem={(item) => <List.Item>{item}</List.Item>}
                    />
                  </Card>
                </Col>
              </Row>

              <Divider />

              <Card
                style={{
                  backgroundColor: "#f6ffed",
                  border: "1px solid #b7eb8f",
                }}
              >
                <Title level={4}>Ready to Start?</Title>
                <Paragraph>
                  Once you've reviewed all settings and selected your dataset, 
                  click the 'Start Workflow' button to begin your phylogenetic analysis. 
                  The system will handle all computational steps automatically.
                </Paragraph>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <Button 
                    type="primary" 
                    size="large"
                    onClick={() => window.location.href = '/workflow'}
                    icon={<RocketOutlined />}
                  >
                    Configure New Workflow
                  </Button>
                </div>
              </Card>
            </div>
          ),
        },
      },
    },
    workflowGuide: {
      title: "Workflow Guide",
      icon: <FileTextOutlined />,
      count: 4,
      subsections: {
        overview: {
          title: "Workflow Overview",
          content: (
            <div>
              <Title level={2}>PhyloTreeMiner Workflow Overview</Title>

              <Alert
                message="Integrated Workflow"
                description="Complete and automated pipeline for large-scale phylogenetic analysis"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Paragraph>
                PhyloTreeMiner provides a complete and standardized workflow for
                phylogenetic analyses, encapsulated in a Docker environment. The
                solution allows execution of alignment and phylogenetic tree
                construction pipelines in a{" "}
                <Text strong>reproducible and efficient</Text> manner.
              </Paragraph>

              <Card
                title="📋 Workflow Steps"
                style={{ marginBottom: 24 }}
                type="inner"
              >
                <List
                  bordered
                  dataSource={[
                    "Sequence alignment using MAFFT or Clustal Omega",
                    "Phylogenetic tree construction using IQ-TREE or RAxML-NG",
                    "Subtree mining and analysis",
                    "Result generation and metadata collection",
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text strong>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              <Title level={3}>Main Components</Title>
              <Paragraph>
                The workflow is controlled by a JSON configuration file that
                provides
                <Text strong> total flexibility</Text> in choosing methods and
                parameters for each analysis step.
              </Paragraph>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card
                    size="small"
                    title="Configuration"
                    style={{ height: "100%" }}
                  >
                    <Paragraph>
                      <code>templates/config.json</code> defines all
                      parameters for tree construction and subtree mining
                    </Paragraph>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    size="small"
                    title="Containerization"
                    style={{ height: "100%" }}
                  >
                    <Paragraph>
                      Complete Docker environment with all dependencies
                      pre-installed for maximum reproducibility
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
            </div>
          ),
        },
        configuration: {
          title: "Configuration Guide",
          content: (
            <div>
              <Title level={2}>Configuration Guide</Title>

              <Alert
                message="Central Configuration File"
                description="The entire workflow is controlled through templates/config.json"
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Paragraph>
                The workflow is configured through the{" "}
                <code>templates/config.json</code> file. This JSON file defines
                all parameters for tree construction and subtree mining.
              </Paragraph>

              <Card
                title="Main Configuration Sections"
                style={{ marginBottom: 24 }}
              >
                <List
                  bordered
                  dataSource={[
                    "tree_config: Main tree construction parameters",
                    "subtree_config: Subtree mining configuration",
                    "subtree_miner_configs: Specific mining algorithm configurations",
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text strong>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              <Title level={3}>📋 Configuration Example</Title>
              <Paragraph>
                Basic configuration for a standard analysis:
              </Paragraph>

              <Card>
                <pre
                  style={{
                    fontSize: "12px",
                    backgroundColor: "#f5f5f5",
                    padding: "16px",
                    borderRadius: "4px",
                  }}
                >
                  {`{
  "log_file": true,
  "project_name": "MyAnalysis",
  "output_log": "./projects/#/out",
  "tree_config": {
    "mode": "auto",
    "construct_tree_method": "distance",
    "align_method": "mafft",
    "num_threads": 4,
    "input_path": "./data/my_sequences",
    "output_path": "./projects/MyAnalysis/out",
    "output_format": "nexus"
  },
  "subtree_config": {
    "construct_tree_method": "distance",
    "input_path": "./projects/#/out/Trees",
    "output_path": "./projects/#/out",
    "input_format": "nexus",
    "output_format": "nexus",
    "resume_infos": true,
    "save_metadata": true,
    "subtree_miner": true
  }
}`}
                </pre>
              </Card>

              <Alert
                message="Performance Tip"
                description="Adjust 'num_threads' according to available CPUs for parallel processing"
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            </div>
          ),
        },
        inputOutput: {
          title: "Input & Output Formats",
          content: (
            <div>
              <Title level={2}>Input and Output Formats</Title>

              <Row gutter={[16, 24]}>
                <Col span={12}>
                  <Card
                    title="📥 Input Requirements"
                    style={{ height: "100%" }}
                    type="inner"
                  >
                    <List
                      bordered
                      dataSource={[
                        "Input sequences: FASTA format (.fasta, .fa)",
                        "Multiple sequence files supported",
                        "Automatic batch processing of datasets",
                        "Automatic format and content validation",
                      ]}
                      renderItem={(item) => (
                        <List.Item>
                          <Text>{item}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    title="📤 Output Formats"
                    style={{ height: "100%" }}
                    type="inner"
                  >
                    <List
                      bordered
                      dataSource={[
                        "Trees: Nexus (.nexus) or Newick (.nwk)",
                        "Alignments: Standard alignment formats",
                        "Log files: Detailed execution logs",
                        "Metadata: JSON with metadata for mined subtrees",
                        "FPMax Results: Identified frequent patterns",
                      ]}
                      renderItem={(item) => (
                        <List.Item>
                          <Text>{item}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              </Row>

              <Divider />

              <Title level={3}>Directory Structure</Title>

              <Card>
                <pre
                  style={{
                    fontSize: "12px",
                    backgroundColor: "#f5f5f5",
                    padding: "16px",
                    borderRadius: "4px",
                  }}
                >
                  {`project/
├── data/                 # Input data
│   ├── sequences.fasta
│   └── another_dataset.fa
├── templates/
│   └── config.json      # Configuration file
└── projects/            # Analysis results
    └── MyProject/
        ├── out/
        │   ├── Trees/   # Generated trees
        │   ├── Alignments/ # Alignments
        │   └── logs/    # Execution logs
        └── results/     # Final results`}
                </pre>
              </Card>
            </div>
          ),
        },
        performance: {
          title: "Performance Optimization",
          content: (
            <div>
              <Title level={2}>Performance Optimization</Title>

              <Alert
                message="Optimization for Large Scale"
                description="Configure properly to handle large phylogenetic datasets"
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Paragraph>
                Optimize workflow execution by properly configuring resource
                allocation and parallel processing.
              </Paragraph>

              <Card
                title="Key Performance Parameters"
                style={{ marginBottom: 24 }}
              >
                <List
                  bordered
                  dataSource={[
                    "num_threads: Number of CPU threads for parallel processing",
                    "align_method: Choice between MAFFT (faster) and ClustalW",
                    "construct_tree_method: Selection of tree construction algorithms",
                    "memory_allocation: Resource allocation in Docker",
                    "mode: Operation mode (auto, OFST, distance, parsimony)",
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text strong>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              <Title level={3}>💡 Recommended Settings</Title>
              <Paragraph>
                For optimal performance on a standard workstation:
              </Paragraph>

              <Card style={{ marginBottom: 16 }}>
                <pre
                  style={{
                    fontSize: "12px",
                    backgroundColor: "#f6ffed",
                    padding: "16px",
                    borderRadius: "4px",
                  }}
                >
                  {`{
  "num_threads": 8,
  "align_method": "mafft",
  "construct_tree_method": "nj",
  "tree_config": {
    "mode": "auto"
  }
}`}
                </pre>
              </Card>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card
                    size="small"
                    title="🖥️ Recommended Hardware"
                    style={{ height: "100%" }}
                  >
                    <List
                      size="small"
                      dataSource={[
                        "CPU: 8+ cores for parallel processing",
                        "RAM: 16GB+ for large datasets",
                        "Storage: SSD for fast file I/O",
                        "Docker: 4GB+ allocated memory",
                      ]}
                      renderItem={(item) => <List.Item>{item}</List.Item>}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    size="small"
                    title="🚀 Optimization Tips"
                    style={{ height: "100%" }}
                  >
                    <List
                      size="small"
                      dataSource={[
                        "Use MAFFT for large datasets",
                        "Adjust num_threads according to CPU availability",
                        "Monitor memory usage during execution",
                        'Use "auto" mode for automatic balancing',
                      ]}
                      renderItem={(item) => <List.Item>{item}</List.Item>}
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          ),
        },
      },
    },
    cliDockerExecution: {
      title: "CLI & Docker Execution",
      icon: <BookOutlined />,
      count: 3,
      subsections: {
        dockerExecution: {
          title: "Docker Execution Guide",
          content: (
            <div>
              <Title level={2}>Docker Execution Guide</Title>

              <Alert
                message="Execution with Maximum Reproducibility"
                description="Use Docker for isolated and consistent environment on any system"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Paragraph>
                Execute the PhyloTreeMiner workflow using Docker for maximum
                reproducibility and isolation.
              </Paragraph>

              <Card
                title="📥 Step 1: Build Docker Image"
                style={{ marginBottom: 16 }}
              >
                <Paragraph>
                  Build the Docker image before first execution:
                </Paragraph>
                <Card>
                  <pre
                    style={{
                      fontSize: "14px",
                      backgroundColor: "#001529",
                      color: "#fff",
                      padding: "16px",
                      borderRadius: "4px",
                    }}
                  >
                    docker build -t phylotreeminer:latest .
                  </pre>
                </Card>
                <Alert
                  message="Attention"
                  description="This step may take several minutes the first time while Conda downloads all dependencies"
                  type="warning"
                  showIcon
                  style={{marginTop: '8px'}}
                />
              </Card>

              <Card
                title="⚙️ Step 2: Prepare Configuration"
                style={{ marginBottom: 16 }}
              >
                <Paragraph>
                  Edit <code>templates/config.json</code> with your analysis
                  parameters:
                </Paragraph>
                <Card>
                  <pre
                    style={{
                      fontSize: "12px",
                      backgroundColor: "#f5f5f5",
                      padding: "16px",
                      borderRadius: "4px",
                    }}
                  >
                    {`{
  "project_name": "MyAnalysis",
  "tree_config": {
    "input_path": "./data/my_sequences",
    "output_path": "./projects/MyAnalysis/out",
    "num_threads": 4
  }
}`}
                  </pre>
                </Card>
              </Card>

              <Card
                title="🚀 Step 3: Execute Workflow"
                style={{ marginBottom: 16 }}
              >
                <Paragraph>
                  Run the container with volume mounts for data access:
                </Paragraph>

                <Title level={4}>Linux/macOS</Title>
                <Card style={{ marginBottom: 16 }}>
                  <pre
                    style={{
                      fontSize: "12px",
                      backgroundColor: "#001529",
                      color: "#fff",
                      padding: "16px",
                      borderRadius: "4px",
                    }}
                  >
                    {`docker run --rm \\
  -v "$(pwd)/data":/app/data \\
  -v "$(pwd)/projects":/app/projects \\
  -v "$(pwd)/templates/config.json":/app/templates/config.json \\
  phylotreeminer:latest`}
                  </pre>
                </Card>

                <Title level={4}>Windows PowerShell</Title>
                <Card>
                  <pre
                    style={{
                      fontSize: "12px",
                      backgroundColor: "#001529",
                      color: "#fff",
                      padding: "16px",
                      borderRadius: "4px",
                    }}
                  >
                    {`docker run --rm \\
  -v "$(pwd)/data":/app/data \\
  -v "$(pwd)/projects":/app/projects \\
  -v "$(pwd)/templates/config.json":/app/templates/config.json \\
  phylotreeminer:latest`}
                  </pre>
                </Card>
              </Card>

              <Alert
                message="Results"
                description="After execution, your result files will be available in the local projects/ folder"
                type="success"
                showIcon
              />
            </div>
          ),
        },
        localExecution: {
          title: "Local CLI Execution",
          content: (
            <div>
              <Title level={2}>Local CLI Execution</Title>

              <Alert
                message="Direct Execution without Container"
                description="Execute PhyloTreeMiner directly on your local machine"
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Paragraph>
                Execute PhyloTreeMiner directly on your local machine without
                Docker.
              </Paragraph>

              <Card title="📋 Prerequisites" style={{ marginBottom: 24 }}>
                <List
                  bordered
                  dataSource={[
                    "Python 3.10 or higher",
                    "All dependencies from environment.yml",
                    "MAFFT, IQ-TREE, RAxML-NG installed system-wide",
                    "Python packages: Biopython, DendroPy, Pandas",
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              <Card title="⚡ Execution Command" style={{ marginBottom: 16 }}>
                <Paragraph>Execute the workflow directly:</Paragraph>
                <Card style={{ marginBottom: 16 }}>
                  <pre
                    style={{
                      fontSize: "14px",
                      backgroundColor: "#001529",
                      color: "#fff",
                      padding: "16px",
                      borderRadius: "4px",
                    }}
                  >
                    python workflow.py --path "templates/config.json"
                  </pre>
                </Card>

                <Paragraph>Or using Python 3 explicitly:</Paragraph>
                <Card>
                  <pre
                    style={{
                      fontSize: "14px",
                      backgroundColor: "#001529",
                      color: "#fff",
                      padding: "16px",
                      borderRadius: "4px",
                    }}
                  >
                    python3 workflow.py --path "templates/config.json"
                  </pre>
                </Card>
              </Card>

              <Card
                title="Environment Configuration"
                style={{ marginBottom: 16 }}
              >
                <Paragraph>
                  Create and activate the Conda environment from environment.yml:
                </Paragraph>
                <Card>
                  <pre
                    style={{
                      fontSize: "12px",
                      backgroundColor: "#001529",
                      color: "#fff",
                      padding: "16px",
                      borderRadius: "4px",
                    }}
                  >
                    {`conda env create -f environment.yml
conda activate phylotreeminer`}
                  </pre>
                </Card>
              </Card>

              <Alert
                message="Local Execution Advantages"
                description={
                  <List
                    size="small"
                    dataSource={[
                      "Direct access to system resources",
                      "Easier debugging",
                      "Integration with local tools",
                      "Potentially better performance",
                    ]}
                    renderItem={(item) => <List.Item>{item}</List.Item>}
                  />
                }
                type="info"
                showIcon
              />
            </div>
          ),
        },
        troubleshooting: {
          title: "Troubleshooting & Common Issues",
          content: (
            <div>
              <Title level={2}>Troubleshooting</Title>

              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={8}>
                  <Card
                    title="🐳 Docker Issues"
                    size="small"
                    style={{ height: "100%" }}
                  >
                    <List
                      size="small"
                      dataSource={[
                        "Permission errors: Ensure Docker has access to mounted directories",
                        "Insufficient memory: Increase memory allocation in Docker Desktop",
                        "Build failures: Check network connection for downloads",
                        "Image not found: Verify image name in build",
                      ]}
                      renderItem={(item) => (
                        <List.Item>
                          <Text>{item}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    title="⚡ Execution Issues"
                    size="small"
                    style={{ height: "100%" }}
                  >
                    <List
                      size="small"
                      dataSource={[
                        "Missing input files: Check paths in config.json",
                        "Alignment failures: Verify FASTA format and content",
                        "Tree construction errors: Validate alignment results first",
                        "Permission denied: Check write permissions in directories",
                      ]}
                      renderItem={(item) => (
                        <List.Item>
                          <Text>{item}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    title="🚀 Performance Issues"
                    size="small"
                    style={{ height: "100%" }}
                  >
                    <List
                      size="small"
                      dataSource={[
                        "Slow execution: Increase num_threads in configuration",
                        "Memory errors: Reduce num_threads or dataset size",
                        "Disk space: Monitor projects/ directory growth",
                        "CPU overload: Adjust number of threads according to availability",
                      ]}
                      renderItem={(item) => (
                        <List.Item>
                          <Text>{item}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              </Row>

              <Card title="Common Solutions" style={{ marginBottom: 16 }}>
                <List
                  bordered
                  dataSource={[
                    "Check if all paths in config.json exist",
                    "Confirm FASTA sequences are in correct format",
                    "Validate read/write permissions in data/ and projects/ directories",
                    "Check detailed logs in projects/[project_name]/out/logs/",
                    "Test with small dataset before running complete analysis",
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              <Alert
                message="Debug Tip"
                description="Always check log files for detailed information about errors and warnings"
                type="info"
                showIcon
              />
            </div>
          ),
        },
      },
    },
    toolsReference: {
      title: "Tools Reference",
      icon: <ToolOutlined />,
      count: 4,
      subsections: {
        alignmentTools: {
          title: "Alignment Tools",
          content: (
            <div>
              <Title level={2}>Alignment Tools</Title>

              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <Card
                    title="⚡ MAFFT"
                    style={{ height: "100%" }}
                    extra={<Tag color="blue">Recommended</Tag>}
                  >
                    <Paragraph>
                      <strong>Method:</strong> Multiple alignment using fast
                      Fourier transform
                      <br />
                      <strong>Use Cases:</strong> Large datasets,
                      faster execution
                      <br />
                      <strong>Configuration:</strong> align_method: "mafft"
                    </Paragraph>
                    <Alert
                      message="Advantages"
                      description="Superior speed for large datasets, good accuracy"
                      type="success"
                      size="small"
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="🎯 Clustal Omega" style={{ height: "100%" }}>
                    <Paragraph>
                      <strong>Method:</strong> Progressive multiple sequence
                      alignment
                      <br />
                      <strong>Use Cases:</strong> Smaller datasets, high
                      accuracy
                      <br />
                      <strong>Configuration:</strong> align_method: "clustalw"
                    </Paragraph>
                    <Alert
                      message="Characteristics"
                      description="High reliability, suitable for precise analyses"
                      type="info"
                      size="small"
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          ),
        },
        treeTools: {
          title: "Tree Construction Tools",
          content: (
            <div>
              <Title level={2}>Tree Construction Tools</Title>

              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={8}>
                  <Card
                    title="📊 IQ-TREE"
                    size="small"
                    style={{ height: "100%" }}
                    extra={<Tag color="green">ML</Tag>}
                  >
                    <Paragraph>
                      <strong>Method:</strong> Maximum likelihood inference
                      <br />
                      <strong>Use Cases:</strong> High accuracy phylogenetic
                      inference
                    </Paragraph>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    title="⚡ RAxML-NG"
                    size="small"
                    style={{ height: "100%" }}
                    extra={<Tag color="green">ML</Tag>}
                  >
                    <Paragraph>
                      <strong>Method:</strong> Randomized Axelerated Maximum
                      Likelihood
                      <br />
                      <strong>Use Cases:</strong> Large-scale phylogenetic
                      analyses
                    </Paragraph>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    title="🎯 Neighbor-Joining"
                    size="small"
                    style={{ height: "100%" }}
                    extra={<Tag color="orange">Distance</Tag>}
                  >
                    <Paragraph>
                      <strong>Method:</strong> Distance-based construction
                      <br />
                      <strong>Use Cases:</strong> Fast construction, large
                      datasets
                      <br />
                      <strong>Configuration:</strong> construct_tree_method: "nj"
                    </Paragraph>
                  </Card>
                </Col>
              </Row>

              <Card title="📈 Method Comparison">
                <List
                  dataSource={[
                    "Maximum Likelihood (IQ-TREE, RAxML): High accuracy, computationally intensive",
                    "Neighbor-Joining: Fast, suitable for large datasets and exploratory analyses",
                    "UPGMA: Simple, clustering-based, useful for initial analyses",
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </div>
          ),
        },
        miningAlgorithms: {
          title: "Mining Algorithms",
          content: (
            <div>
              <Title level={2}>Mining Algorithms</Title>

              <Card
                title="⚡ FPMax Algorithm"
                style={{ marginBottom: 24 }}
                extra={<Tag color="red">High Performance</Tag>}
              >
                <Paragraph>
                  <strong>Description:</strong> Efficient algorithm for mining
                  frequent itemsets
                  <br />
                  <strong>Importance:</strong> Makes feasible the comparison of
                  thousands of trees and millions of subtrees
                </Paragraph>

                <Alert
                  message="Computational Challenge"
                  description="Comparing hundreds or thousands of trees and their possible millions of subtrees is an NP-hard large-scale problem"
                  type="warning"
                  style={{ marginBottom: 16 }}
                />

                <Title level={4}>Why FPMax?</Title>
                <List
                  dataSource={[
                    "High-performance computer science approach",
                    "Ability to handle NP-hard problems",
                    "Analysis completed in reasonable time",
                    "Large-scale efficiency",
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </div>
          ),
        },
        integrationTools: {
          title: "Integration Tools",
          content: (
            <div>
              <Title level={2}>Integration Tools</Title>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card
                    title="🌐 NCBI Integration"
                    style={{ height: "100%" }}
                    extra={<Tag color="blue">Data Source</Tag>}
                  >
                    <Paragraph>
                      <strong>Functionality:</strong> Direct query to NCBI
                      database
                      <br />
                      <strong>Advantages:</strong> Automated acquisition and
                      enrichment with metadata
                    </Paragraph>
                    <List
                      size="small"
                      dataSource={[
                        "Collection date",
                        "Geographical location",
                        "Gene information",
                        "Organism metadata",
                      ]}
                      renderItem={(item) => <List.Item>{item}</List.Item>}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    title="📊 OWID Integration"
                    style={{ height: "100%" }}
                    extra={<Tag color="purple">Epidemiology</Tag>}
                  >
                    <Paragraph>
                      <strong>Functionality:</strong> Cross-referencing with
                      epidemiological data from Our World in Data
                      <br />
                      <strong>Importance:</strong> Connection between genetic
                      patterns and real-world data
                    </Paragraph>
                    <List
                      size="small"
                      dataSource={[
                        "Variant impact validation",
                        "Early warning system",
                        "Intervention monitoring",
                      ]}
                      renderItem={(item) => <List.Item>{item}</List.Item>}
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          ),
        },
      },
    }
  };



  const navigateTo = (sectionKey, subsectionKey = null) => {
    if (sectionKey === "home") {
      setCurrentSection("home");
      setCurrentSubsection(null);
      setBreadcrumbPath(["Home", "PhyloTreeMiner-Docs"]);
      return;
    }

    if (
      subsectionKey &&
      documentationStructure[sectionKey]?.subsections?.[subsectionKey]
    ) {
      setCurrentSection(sectionKey);
      setCurrentSubsection(subsectionKey);
      setBreadcrumbPath([
        "Home",
        "PhyloTreeMiner-Docs",
        documentationStructure[sectionKey].title,
        documentationStructure[sectionKey].subsections[subsectionKey].title,
      ]);
    } else if (documentationStructure[sectionKey]) {
      setCurrentSection(sectionKey);
      setCurrentSubsection(null);
      setBreadcrumbPath([
        "Home",
        "PhyloTreeMiner-Docs",
        documentationStructure[sectionKey].title,
      ]);
    }
  };

  const generateMenuItems = () => {
    const items = [];

    items.push({
      key: "home",
      icon: <HomeOutlined />,
      label: "Home",
      onClick: () => navigateTo("home"),
    });

    // Seções principais
    Object.keys(documentationStructure).forEach((sectionKey) => {
      if (sectionKey !== "home") {
        const section = documentationStructure[sectionKey];

        items.push({
          key: sectionKey,
          icon: section.icon,
          label: `${section.title} (${section.count || 0})`,
          children: section.subsections
            ? Object.keys(section.subsections).map((subsectionKey) => ({
                key: `${sectionKey}-${subsectionKey}`,
                label: section.subsections[subsectionKey].title,
                onClick: () => navigateTo(sectionKey, subsectionKey),
              }))
            : [],
        });
      }
    });

    return items;
  };

  const renderContent = () => {
    if (currentSection === "home") {
      return documentationStructure.home.content;
    }

    const section = documentationStructure[currentSection];

    if (!section) {
      return (
        <div>
          <Title level={2}>Section Not Found</Title>
          <Paragraph>The requested section does not exist.</Paragraph>
        </div>
      );
    }

    if (!currentSubsection) {
      return (
        <div>
          <Title level={2}>{section.title}</Title>
          <Paragraph>Select a topic to view its content:</Paragraph>
          <List
            size="large"
            bordered
            dataSource={
              section.subsections ? Object.keys(section.subsections) : []
            }
            renderItem={(key) => (
              <List.Item
                style={{ cursor: "pointer", padding: "16px" }}
                onClick={() => navigateTo(currentSection, key)}
              >
                <FileTextOutlined
                  style={{ marginRight: "12px", color: "#1890ff" }}
                />
                <Text strong>{section.subsections[key].title}</Text>
              </List.Item>
            )}
          />
        </div>
      );
    }

    return (
      section.subsections[currentSubsection]?.content || (
        <div>
          <Title level={2}>Content Not Found</Title>
          <Paragraph>The requested content does not exist.</Paragraph>
        </div>
      )
    );
  };

  return (
    <Layout
      style={{
        maxHeight: "77vh",
        borderRadius: 8,
        backgroundColor: "#ffffff",
      }}
    >
      <Header
        style={{
          padding: "0 16px",
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Space>
          <Title level={3} style={{ margin: 0 }}>
            PhyloTreeMiner Docs
          </Title>
        </Space>
      </Header>

      <Layout style={{ borderRadius: 8 }}>
        <Sider
          width={300}
          style={{ backgroundColor: "#ffffff", overflow: 'auto' }}
          trigger={null}
        >
          <Menu
            mode="inline"
            defaultSelectedKeys={["home"]}
            defaultOpenKeys={["workflowGuide", "cliDockerExecution"]}
            style={{ borderRight: 0, height: "100%" }}
            items={generateMenuItems()}
          />
        </Sider>

        <Layout
          style={{
            padding: "24px",
            backgroundColor: "#F3F3F3FF",
            borderRadius: 8,
          }}
        >
          <Content
            style={{
              backgroundColor: "#ffffff",
              padding: 32,
              margin: 0,
              minHeight: 280,
              borderRadius: 8,
              overflow: 'auto',
              maxHeight:'750px',
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
            }}
          
          >
            <Breadcrumb style={{ marginBottom: "24px" }}>
              {breadcrumbPath.map((item, index) => (
                <Breadcrumb.Item key={index}>{item}</Breadcrumb.Item>
              ))}
            </Breadcrumb>

            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default PhyloTreeMinerDocs;
