import { useRef, useState, useEffect } from "react";
import {
  Select,
  Typography,
  Steps,
  Form,
  InputNumber,
  Upload,
  Descriptions,
  message,
  Card,
  Row,
  Col,
  Button,
  Input,
  Radio,
  Checkbox,
  Divider,
  Tour,
  Flex,
  Modal,
  Slider,
  Space,
} from "antd";
import {
  SettingOutlined,
  DatabaseOutlined,
  RocketOutlined,
  UploadOutlined,
  FolderAddOutlined,
  SearchOutlined,
  DownloadOutlined,
  MailOutlined,
  DownCircleOutlined,
  UpCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { Option } = Select;

const PipelineConfigurator = () => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [messageInfo, contextHolder] = message.useMessage();
  const [dataFolders, setDataFolders] = useState([]);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const projectNameValue = Form.useWatch("project_name", form);
  const treeMode = Form.useWatch(["trees", "mode"], form);
  const treeOutputFormat =
    Form.useWatch(["trees", "output_format"], form) || "nexus";
  const subtreeMinerMode = Form.useWatch(["subtrees", "subtree_miner"], form);
  const supportFpmaxMode = Form.useWatch(
    ["subtree_mining", "support_fpmax"],
    form
  );

  const [pipelineData, setPipelineData] = useState({
    config: null,
    dataset: null,
  });

  const [uploading, setUploading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadForm] = Form.useForm();

  const [ncbiModalVisible, setNcbiModalVisible] = useState(false);
  const [ncbiLoading, setNcbiLoading] = useState(false);
  const [ncbiEmail, setNcbiEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [ncbiForm] = Form.useForm();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const API_BASE_URL = "http://localhost:8000";

  const fetchFoldersData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dataFolders`);
      if (!response.ok) throw new Error("Falha ao carregar dados.");

      const json = await response.json();
      const folders = Array.isArray(json) ? json : [];
      setDataFolders(
        folders.map((folder) => ({
          value: folder.name,
          label: folder.name,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNcbiEmail = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ncbi/email`);
      const data = await response.json();
      setNcbiEmail(data.email);
    } catch (error) {
      console.error("Error loading NCBI email:", error);
    }
  };

  const searchSpecies = async (query) => {
    if (query.length < 3) return;

    const key = "species-search";
    messageInfo.loading({
      content: "Searching for species...",
      key,
      duration: 0,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/ncbi/search-species`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, retmax: 10 }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.species.length > 0) {
          setSearchResults(data.species);
          messageInfo.success({
            content: `Found ${data.species.length} species.`,
            key,
            duration: 3,
          });
        } else {
          messageInfo.info({
            content: "No species found with that query.",
            key,
            duration: 3,
          });
          setSearchResults([]);
        }
      } else {
        messageInfo.error({
          content: "An error occurred while searching for species.",
          key,
          duration: 5,
        });
      }
    } catch (error) {
      messageInfo.error({
        content: `Connection error: ${error.message}`,
        key,
        duration: 5,
      });
      console.error("Error in species search:", error);
    }
  };

  const handleNcbiDownload = async (values) => {
    setNcbiLoading(true);

    messageInfo.loading({
      content: "Initiating download from NCBI...",
      key: "ncbi-download",
      duration: 0,
    });

    try {
      const payload = {
        query: values.query,
        species_name: values.speciesName || undefined,
        retmax: values.retmax || 100,
        initial_min_length: values.initial_min_length,
        refined_min_length: values.refined_min_length,
        utr5_end: values.utr5_end,
        utr3_start: values.utr3_start,
        similarity_threshold: values.similarity_threshold,
      };

      Object.keys(payload).forEach((key) => {
        if (
          payload[key] === undefined ||
          payload[key] === null ||
          payload[key] === ""
        ) {
          delete payload[key];
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/ncbi/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        console.log(data);
        messageInfo.success({
          content: (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                textAlign: "left",
              }}
            >
              <span style={{ fontWeight: "bold", fontSize: "1.1em" }}>
                Download Successful!
              </span>
              <span>
                <strong>Species:</strong> {data.data?.species}
              </span>
              <span>
                <strong>Sequences Processed:</strong> {data.data.count}
              </span>
              <span>
                <strong>Saved to Folder:</strong> {data.data?.species}
              </span>
            </div>
          ),
          key: "ncbi-download",
          duration: 5,
        });

        setNcbiModalVisible(false);
        ncbiForm.resetFields();
        fetchFoldersData();
      } else {
        messageInfo.error({
          content: `Download Failed: ${data?.detail}`,
          key: "ncbi-download",
          duration: 5,
        });
      }
    } catch (error) {
      messageInfo.error({
        content: `Connection Error: ${error?.message}`,
        key: "ncbi-download",
        duration: 5,
      });
    } finally {
      setNcbiLoading(false);
    }
  };

  useEffect(() => {
    if (ncbiModalVisible) {
      messageInfo.info({
        content: (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              textAlign: "left",
            }}
          >
            <span style={{ fontWeight: "bold", fontSize: "1.1em" }}>
              NCBI Search Tips
            </span>
            <div>
              <p style={{ margin: 0, padding: 0 }}>
                Use <strong>[Organism]</strong> for specific species.
              </p>
              <p
                style={{
                  margin: "2px 0 0 12px",
                  padding: 0,
                  fontSize: "0.9em",
                  color: "#555",
                }}
              >
                e.g., "Zika virus[Organism] AND complete genome"
              </p>
            </div>
            <div>
              <p style={{ margin: 0, padding: 0 }}>
                Leave the 'Save As' field empty for an automatic name.
              </p>
            </div>
          </div>
        ),
        duration: 8,
      });
    }
  }, [ncbiModalVisible]);

  useEffect(() => {
    fetchFoldersData();
  }, []);

  const handleNext = async () => {
    if (current === 0) {
      try {
        const values = await form.validateFields({ recursive: true });
        
        let ignoreMode = values.trees?.ignore_mode;
        
        if (Array.isArray(ignoreMode)) {
          ignoreMode = ignoreMode.filter(method => method !== 'none');
        } else if (ignoreMode === 'none') {
          ignoreMode = []; 
        }
        
        const finalConfig = {
          general: {
            project_name: values.project_name.replace(/ /g, "_"),
            output_dir: `projects/${values.project_name.replace(/ /g, "_")}/out/`,
            log_file: `projects/${values.project_name.replace(/ /g, "_")}/out/outputs/log_setup_${
              new Date().toISOString().split("T")[0]
            }.log`,
          },
          subtrees: {
            ...(values.subtrees || {}),
            input_format: values.trees?.output_format || "nexus",
          },
          trees: {
            mode: values.trees?.mode === "auto" || values.trees?.mode === "advanced"
              ? values.trees?.mode
              : values.trees?.construct_method,
            ignore_mode: ignoreMode || [], 
            num_threads: values.trees?.num_threads || 1,
            construct_method: values.trees?.algorithm_reconstruct || "nj",
            alignment_method: values.trees?.alignment_method || "mafft",
            input_format: values.trees?.input_format || "nexus",
            output_format: values.trees?.output_format || "nexus",
          },
          subtree_mining: values.subtree_mining,
        };

        finalConfig.subtrees.input_format = finalConfig.trees.output_format;

        setPipelineData((prev) => ({ ...prev, config: finalConfig }));
        setCurrent(current + 1);
      } catch (errorInfo) {
        console.log("Falha na validação:", errorInfo);
      }
    } else if (current === 1) {
      if (!pipelineData.dataset) {
        messageInfo.error("Por favor, selecione ou envie um arquivo de dataset.");
        return;
      }
      setCurrent(current + 1);
    }
  };

  const handlePrev = () => setCurrent(current - 1);

  const handleStartWorkflow = async (projectName) => {
    const finalPayload = convertToFinalFormat(pipelineData);

    // console.log(`Iniciando Workflow para o projeto '${projectName}' com os seguintes dados:`, JSON.stringify(finalPayload, null, 2));
    try {
      const response = await fetch(
        `http://localhost:8000/projects/${projectName}/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ configs: finalPayload }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || `Erro do servidor: ${response.status}`
        );
      }

      messageInfo.success(
        "Workflow iniciado! Acompanhe o progresso na página de projetos."
      );
      navigate("/projects");
    } catch (error) {
      console.error("Falha ao iniciar o workflow:", error);
      messageInfo.error(
        `Não foi possível iniciar o workflow: ${error.message}`
      );
    }
  };

  const handleUploadData = async (values) => {
    setUploading(true);

    const formData = new FormData();
    formData.append("name", values.folderName.replace(" ", "_"));

    values.files.fileList.forEach((file) => {
      formData.append("files", file.originFileObj);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/upload-data`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Falha no upload");
      }

      const result = await response.json();
      messageInfo.success(
        `Upload realizado! ${result.total_sequences} sequências processadas.`
      );
      setUploadModalVisible(false);
      uploadForm.resetFields();
      fetchFoldersData();
    } catch (error) {
      messageInfo.error("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const convertToFinalFormat = (pipelineData) => {
    const { config = {}, dataset = {} } = pipelineData || {};
    const {
      general = {},
      trees = {},
      subtrees = {},
      subtree_mining = {},
    } = config;

    const projectName = general.project_name || "default_project";
    const outputPath = `./projects/#/out`;

    const ignoreMode = trees.ignore_mode || [];

    const finalFormat = {
      log_file: true,
      project_name: projectName,
      output_log: outputPath,

      tree_config: {
        mode: trees.mode === "auto" ? "auto" : trees.mode,
        ignore_mode: ignoreMode,
        construct_tree_method:
          trees.mode === "manual" ? trees.algorithm_reconstruct : "nj",
        align_method:
          trees.mode === "manual" ? trees.alignment_method : "mafft",
        num_threads: trees.num_threads || 1,
        input_path: `./data/${dataset.name || "unknown_dataset.fasta"}`,
        output_path: `${outputPath}/Trees`,
        output_format: trees.output_format || "nexus",
      },

      subtree_config: {
        construct_tree_method: subtrees.method || "parsimony",
        input_path: `${outputPath}/Trees`,
        output_path: `${outputPath}/Subtrees`,
        input_format: subtrees.input_format || "nexus",
        output_format: subtrees.output_format || "nexus",
        resume_infos: subtrees.resume_infos || false,
        save_metadata: subtrees.save_metadata || false,
        subtree_miner: subtrees.subtree_miner || false,
      },
    };

    if (finalFormat.subtree_config.subtree_miner === true) {
      finalFormat.subtree_config.subtree_miner_configs = {
        mode: subtree_mining.mode ?? "OFST",
        save_fpmax: subtree_mining.save_fpmax ?? false,
        output_path: `${outputPath}`,

        support_fpmax: subtree_mining.support_fpmax ?? "auto",
      };
    }

    return finalFormat;
  };

  const renderConfigValue = (value) => {
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "None";
      }
      return (
        <div>
          {value.map((item, index) => (
            <div key={index} style={{ marginBottom: "4px" }}>
              {item} 
            </div>
          ))}
        </div>
      );
    }
    
    if (typeof value === "object" && value !== null) {
      const formattedDatas = Object.entries(value).map(
        ([label, children], index) => {
          return {
            key: String(index + 1),
            label: label,
            children: children,
          };
        }
      );

      return (
        <Descriptions
          column={1}
          bordered
          size="small"
          style={{ padding: "8px", marginTop: "8px" }}
        >
          {formattedDatas.map((item) => (
            <Descriptions.Item key={item.key} label={item.label}>
              {Array.isArray(item.children) ? (
                <div>
                  {item.children.map((child, idx) => (
                    <div key={idx} style={{ marginBottom: "2px" }}>
                      • {child}
                    </div>
                  ))}
                </div>
              ) : typeof item.children === "string" ? (
                item.children
              ) : typeof item.children === "boolean" ? (
                item.children ? "Yes" : "No"
              ) : (
                item.children
              )}
            </Descriptions.Item>
          ))}
        </Descriptions>
      );
    }
    
    return value || "Not defined";
  };

  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);
  const ref5 = useRef(null);
  const ref6 = useRef(null);

  const stepsTour = [
    {
      title: "Project Name",
      description:
        "Start by defining a unique name for your project. This will be used to create directories and organize all output files.",
      target: () => ref1.current,
    },
    {
      title: "Tree Building Settings",
      description:
        "In this section, you define how the main phylogenetic trees will be generated. Choose between automatic mode to test various combinations or manual mode for greater control.",
      target: () => ref2.current,
    },
    {
      title: "Subtree Building Settings",
      description:
        "Here you configure how subtrees will be extracted from the full trees. Define the construction method and formats.",
      target: () => ref3.current,
    },
    {
      title: "Enable Subtree Mining",
      description:
        "Check this option to enable the pattern mining step, which searches for frequent subtrees in your dataset.",
      target: () => ref4.current,
    },
    {
      title: "Proceed to Next Step",
      description:
        'After reviewing all the settings on this page, click "Next" to proceed to dataset selection.',
      target: () => ref5.current,
    },
    {
      title: "Need Help?",
      description: "You can click here at any time to reopen this guide.",
      target: () => ref6.current,
    },
  ];

  const steps = [
    {
      title: "1. Workflow Configuration",
      status: current === 0 ? "process" : "wait",
      description: "Set the execution parameters.",
      icon: <SettingOutlined />,
      content: (
        <Form form={form} layout="vertical" name="pipeline_config">
          <Divider ref={ref2} orientation="left" style={{ color: "#ADADADFF" }}>
            Tree Building Settings
          </Divider>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
            <Col span={8}>
              <span ref={ref1}>
                <Form.Item
                  name="project_name"
                  label="Project Name"
                  rules={[
                    {
                      required: true,
                      message: "Please enter the project name!",
                    },
                  ]}
                >
                  <Input placeholder="Ex: Analise_Zika_Global" />
                </Form.Item>
              </span>
            </Col>
            <Col span={8}>
              <Form.Item label="Log File (Automatically Generated)">
                <Input
                  value={
                    projectNameValue
                      ? `projects/${projectNameValue}/out/outputs/log_setup_${
                          new Date().toISOString().split("T")[0]
                        }.log`
                      : ""
                  }
                  disabled
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name={["trees", "mode"]}
                label="Construction Mode"
                initialValue="advanced"
                tooltip={
                  <p>
                    <b>Advanced</b>: Combination of all available methods for constructing trees. <br/><br/>
                    <b>Manual</b>: Manually select a single method. 
                  </p>
                }
              >
                <Radio.Group>
                  <Radio value="auto">Only distance and parsimony methods   </Radio>
                  <Radio value="manual">Manual</Radio>
                  <Radio value="advanced">Advanced (all combinations)</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
            <Col span={6}>
              <Form.Item
                name={["trees", "ignore_mode"]}
                label="Ignore Methods (Optional)"
                tooltip="Select multiple methods to ignore in auto/advanced modes"
              >
                <Select
                  mode="multiple" 
                  placeholder="Select methods to ignore"
                  allowClear
                >
                  <Option value="distance">Distance</Option>
                  <Option value="parsimony">Parsimony</Option>
                  <Option value="iqtree">IQ-TREE</Option>
                  <Option value="fasttree">FastTree</Option>
                  <Option value="raxml">RAxML</Option>
                  <Option value="mrbayes">MrBayes</Option>
                  <Option value="none" tooltip='aaaaaa'>None</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name={["trees", "num_threads"]}
                label="Number of threads"
                tooltip="Number of threads to be used in alignment (parallelization)"
                initialValue={1}
              >
                <InputNumber
                  min={1}
                  max={32}
                  step={1}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>

          {treeMode === "manual" && (
            <Row gutter={24}>
              <Col span={6}>
                <Form.Item
                  name={["trees", "construct_method"]}
                  label="Construction Method"
                  initialValue="distance"
                >
                  <Select>
                    <Option value="distance"> Distances</Option>
                    <Option value="parsimony">Parsimony</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name={["trees", "algorithm_reconstruct"]}
                  label="Algorithm for Reconstructing "
                  initialValue="nj"
                >
                  <Select>
                    <Option value="nj">Neighbor-Joining (NJ)</Option>
                    <Option value="upgma">upgma</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name={["trees", "alignment_method"]}
                  label="Alignment Method"
                  initialValue="MAFFT"
                >
                  <Select>
                    <Option value="mafft">MAFFT</Option>
                    <Option value="clustalw">ClustalW</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name={["trees", "input_format"]}
                  label="Input Format"
                  initialValue="nexus"
                >
                  <Select>
                    <Option value="nexus">Nexus (.nexus)</Option>
                    <Option value="nwk">Newick (.nwk)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name={["trees", "output_format"]}
                  label="Output Format"
                  initialValue="nexus"
                >
                  <Select>
                    <Option value="nexus">Nexus (.nexus)</Option>
                    <Option value="nwk">Newick (.nwk)</Option>
                  </Select>
                </Form.Item>
              </Col>
              {/* <Col span={6}>
                            <Form.Item name={['trees', 'construct_mode']} label="Construction Mode" initialValue="distance">
                                <Select>
                                    <Option value="distance">Distance Matrix only</Option>
                                    <Option value="parsimony">Parsimony only</Option>
                                </Select>
                            </Form.Item>
                            </Col> */}
            </Row>
          )}

          <Divider ref={ref3} orientation="left" style={{ color: "#ADADADFF" }}>
            Subtree Construction Settings
          </Divider>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
            <Col span={8}>
              <Form.Item
                name={["subtrees", "method"]}
                label="Construction Method"
                initialValue="distance"
              >
                <Select>
                  <Option value="distance"> Distance </Option>
                  <Option value="parsimony">Parsimony</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Input format">
                <Input value={treeOutputFormat} disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={["subtrees", "output_format"]}
                label="Output format"
                initialValue="nexus"
              >
                <Select>
                  <Option value="nexus">Nexus (.nexus)</Option>
                  <Option value="nwk">Newick (.nwk)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
            <Col span={8}>
              <Form.Item
                name={["subtrees", "resume_infos"]}
                valuePropName="checked"
                initialValue={true}
              >
                <Checkbox> Save Subtree Metadata</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={["subtrees", "save_metadata"]}
                valuePropName="checked"
                initialValue={true}
              >
                <Checkbox> Save Metadata in JSON</Checkbox>
              </Form.Item>
            </Col>

            <Col span={8} ref={ref4}>
              <Form.Item
                name={["subtrees", "subtree_miner"]}
                valuePropName="checked"
                initialValue={true}
              >
                <Checkbox>Perform Subtree Mining</Checkbox>
              </Form.Item>
            </Col>
          </Row>
          {subtreeMinerMode && (
            <div>
              <Divider orientation="left" style={{ color: "#ADADADFF" }}>
                Subtree Mining Settings
              </Divider>

              <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                {/* <Col span={8}>
                                        <Form.Item name={['subtree_mining', 'mode']} label="Modo de Mineração" initialValue="distance">
                                            <Select>
                                                <Option value="OFST">OFST (Only of the Same Tree)</Option>
                                                <Option value="distance">Distância</Option>
                                                <Option value="parsimony">Parsimônia</Option>
                                            </Select>
                                        </Form.Item>

                                    </Col> */}
                <Col span={8}>
                  <Form.Item
                    name={["subtree_mining", "save_fpmax"]}
                    label="Frequent Subtree Mining"
                    valuePropName="checked"
                    initialValue={true}
                  >
                    <Checkbox onChange={{}}> Save FPMAX Results</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={["subtree_mining", "support_fpmax"]}
                    label="FPMAX Support"
                    initialValue="auto"
                  >
                    <Radio.Group>
                      <Radio value="auto">Automatic (0.1 a 1.0)</Radio>
                      <Radio value="manual">Manual</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  {supportFpmaxMode === "manual" && (
                    <Form.Item
                      name={["subtree_mining", "support_value"]}
                      label="Support value"
                    >
                      <InputNumber
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  )}
                </Col>
              </Row>
            </div>
          )}
        </Form>
      ),
    },
    {
      title: "2. Dataset Selection",
      status: current === 1 ? "process" : "wait",
      description:
        "Choose an existing dataset, upload a new one or search in ncbi.",
      icon: <DatabaseOutlined />,
      content: (
        <Card title="Sequence Data Source">
          <Select
            placeholder="Select an existing dataset (Example)"
            style={{ width: "100%", marginBottom: 24 }}
            options={dataFolders}
            onChange={(value) =>
              setPipelineData((prev) => ({ ...prev, dataset: { name: value } }))
            }
          ></Select>

          <Text strong>OR</Text>

          <div style={{ marginTop: 16 }}>
            <Space direction="horizontal">
              <div>
                <Button
                  type="dashed"
                  icon={<UploadOutlined />}
                  onClick={() => setUploadModalVisible(true)}
                  style={{ marginBottom: 16 }}
                >
                  Upload Data
                </Button>

                <Modal
                  title="Upload Files for Analysis"
                  open={uploadModalVisible}
                  onCancel={() => setUploadModalVisible(false)}
                  footer={null}
                >
                  <Form
                    form={uploadForm}
                    layout="vertical"
                    onFinish={handleUploadData}
                  >
                    <Form.Item
                      name="folderName"
                      label="Dataset name"
                      rules={[
                        {
                          required: true,
                          message: "Enter a name for the dataset",
                        },
                      ]}
                      tooltip="Dataset name"
                    >
                      <Input placeholder="e.g., dataset_2025" />
                    </Form.Item>

                    <Form.Item
                      name="files"
                      label="Files"
                      rules={[{ required: true, message: "Select files" }]}
                      tooltip="Select FASTA files or ZIP files containing FASTA files"
                    >
                      <Upload.Dragger
                        multiple
                        beforeUpload={() => false}
                        accept=".fasta,.fa,.fas,.faa,.zip"
                      >
                        <p className="ant-upload-drag-icon">
                          <FolderAddOutlined />
                        </p>
                        <p className="ant-upload-text">
                          Click or drag the .fasta or .zip file to this area
                        </p>
                        <p className="ant-upload-hint">
                          Supports multiple FASTA or ZIP files containing FASTA
                        </p>
                      </Upload.Dragger>
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={uploading}
                      >
                        Upload
                      </Button>
                    </Form.Item>
                  </Form>
                </Modal>
              </div>
              <div>
                <Button
                  type="dashed"
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    setNcbiModalVisible(true);
                    fetchNcbiEmail();
                  }}
                  style={{ marginBottom: 16, marginLeft: 8 }}
                >
                  Search NCBI (Beta Testing)
                </Button>

                <Modal
                  title="Search Sequences in NCBI  (Beta Testing)"
                  open={ncbiModalVisible}
                  onCancel={() => setNcbiModalVisible(false)}
                  footer={null}
                  width={600}
                >
                  <Form
                    form={ncbiForm}
                    layout="vertical"
                    onFinish={handleNcbiDownload}
                  >
                    <Form.Item
                      name="query"
                      label="Search Query"
                      rules={[
                        {
                          required: true,
                          message: "Please enter a search query",
                        },
                      ]}
                      tooltip="e.g., 'Zika virus[Organism] AND complete genome'"
                    >
                      <Input.Search
                        placeholder="e.g., Homo sapiens[Organism]"
                        enterButton={<SearchOutlined />}
                        onSearch={searchSpecies}
                      />
                    </Form.Item>

                    {searchResults.length > 0 && (
                      <Form.Item label="Species Found">
                        <Select
                          placeholder="Select a species"
                          options={searchResults.map((species) => ({
                            value: species.scientific_name,
                            label: `${species.scientific_name} (${
                              species.division || ""
                            })`,
                          }))}
                          onChange={(value) => {
                            ncbiForm.setFieldValue("speciesName", value);
                          }}
                        />
                      </Form.Item>
                    )}

                    <Form.Item
                      name="speciesName"
                      label="Save As (Optional)"
                      tooltip="Custom folder name. If empty, the NCBI species name will be used."
                    >
                      <Input placeholder="Leave empty for automatic name" />
                    </Form.Item>

                    <Form.Item
                      name="retmax"
                      label="Maximum Number of Sequences"
                      initialValue={100}
                    >
                      <InputNumber
                        min={1}
                        max={1000}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>

                    <Form.Item
                      label="NCBI Email"
                      extra="Email used for NCBI queries (required)."
                    >
                      <Input
                        value={ncbiEmail}
                        onChange={(e) => setNcbiEmail(e.target.value)}
                        onBlur={async () => {
                          try {
                            await fetch(`${API_BASE_URL}/api/ncbi/set-email`, {
                              method: "POST",
                              headers: {
                                "Content-Type":
                                  "application/x-www-form-urlencoded",
                              },
                              body: `email=${encodeURIComponent(ncbiEmail)}`,
                            });
                            messageInfo.success("Email updated!");
                          } catch (error) {
                            messageInfo.error("Error updating email.");
                          }
                        }}
                        prefix={<MailOutlined />}
                        placeholder="email@example.com"
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="link"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        icon={
                          showAdvanced ? (
                            <UpCircleOutlined />
                          ) : (
                            <DownCircleOutlined />
                          )
                        }
                      >
                        Advanced Settings
                      </Button>
                    </Form.Item>

                    {showAdvanced && (
                      <>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              name="initial_min_length"
                              label="Initial Min. Length"
                              initialValue={700}
                              tooltip="Initial minimum length in base pairs"
                            >
                              <InputNumber
                                min={1}
                                max={10000}
                                style={{ width: "100%" }}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name="refined_min_length"
                              label="Refined Min. Length"
                              initialValue={9000}
                              tooltip="Refined minimum length in base pairs"
                            >
                              <InputNumber
                                min={1}
                                max={50000}
                                style={{ width: "100%" }}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              name="utr5_end"
                              label="5' UTR End"
                              tooltip="End position of the 5' UTR (leave empty to not remove)"
                              initialValue={0}
                            >
                              <InputNumber min={0} style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name="utr3_start"
                              label="3' UTR Start"
                              tooltip="Start position of the 3' UTR (leave empty to not remove)"
                              initialValue={0}
                            >
                              <InputNumber min={0} style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item
                          name="similarity_threshold"
                          label="Similarity Threshold"
                          initialValue={0.99}
                          tooltip="Threshold for removing similar sequences (0.0 to 1.0)"
                        >
                          <Slider
                            min={0.9}
                            max={1.0}
                            step={0.01}
                            marks={{
                              0.8: "0.8",
                              0.9: "0.9",
                              0.95: "0.95",
                              0.99: "0.99",
                              1.0: "1.0",
                            }}
                          />
                        </Form.Item>
                      </>
                    )}

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={ncbiLoading}
                        disabled={!ncbiEmail}
                      >
                        Search and Download
                      </Button>
                    </Form.Item>
                  </Form>
                </Modal>
              </div>
            </Space>
          </div>
        </Card>
      ),
    },
    {
      title: "3. Review and Start",
      status: current === 2 ? "process" : "wait",
      description: "Confirm the data and start the execution.",
      icon: <RocketOutlined />,
      content: (
        <Card>
          <Title level={5}>Review Final Settings</Title>
          {pipelineData.config && (
            <Descriptions
              title="Workflow Configuration"
              bordered
              column={1}
              size="small"
            >
              {Object.entries(pipelineData.config).map(([key, value]) => (
                <Descriptions.Item
                  key={key}
                  label={key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                >
                  {renderConfigValue(value)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
          {pipelineData.dataset && (
            <Descriptions
              title="Dataset"
              bordered
              column={1}
              size="small"
              style={{ marginTop: 24 }}
            >
              <Descriptions.Item label="Selected File">
                {pipelineData.dataset.name}
              </Descriptions.Item>
              {pipelineData.dataset.size && (
                <Descriptions.Item label="Size">{`${(
                  pipelineData.dataset.size / 1024
                ).toFixed(2)} KB`}</Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Card>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div
        style={{
          borderRadius: 8,
          backgroundColor: "#ffffff",
          padding: 24,
        }}
      >
        <Flex justify="space-between">
          <Title level={3}>New workflow settings</Title>
          <span ref={ref6}>
            <Button type="dashed" onClick={() => setOpen(!open)}>
              Need help?
            </Button>
          </span>
        </Flex>
        <Tour open={open} onClose={() => setOpen(!open)} steps={stepsTour} />

        <Row
          gutter={32}
          style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            margin: "24px 0",
            minHeight: "70vh",
          }}
        >
          <Col
            xs={24}
            md={8}
            lg={6}
            style={{
              backgroundColor: "#E0ECFF96",
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
              padding: 32,
            }}
          >
            <Title level={4} style={{ color: "#000000A8" }}>
              Steps
            </Title>
            <Steps
              current={current}
              direction="vertical"
              items={steps.map((s) => ({
                title: s.title,
                description: s.description,
                status: s.status,
                icon: s.icon,
              }))}
            />
          </Col>
          <Col
            xs={24}
            md={16}
            lg={18}
            style={{
              padding: 32,
            }}
          >
            <div style={{ marginBottom: 64 }}>{steps[current].content}</div>
            <div style={{ marginTop: 24 }}>
              {current > 0 && (
                <Button style={{ margin: "0 8px" }} onClick={handlePrev}>
                  Back
                </Button>
              )}
              {current < steps.length - 1 && (
                <span ref={ref5}>
                  <Button type="primary" onClick={handleNext}>
                    Next
                  </Button>
                </span>
              )}
              {current === steps.length - 1 && (
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  onClick={() =>
                    handleStartWorkflow(
                      pipelineData.config?.general.project_name
                    )
                  }
                  disabled={!pipelineData.config || !pipelineData.dataset}
                >
                  Start Workflow
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default PipelineConfigurator;
