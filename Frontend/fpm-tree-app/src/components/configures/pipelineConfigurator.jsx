import { useRef, useState, useEffect } from 'react';
import {
    Select, Typography, Steps, Form, InputNumber, Upload,
    Descriptions, message, Card, Row, Col, Button, Input,
    Radio, Checkbox, Divider, Tour, Flex
} from 'antd';
import {
    SettingOutlined, DatabaseOutlined, RocketOutlined, UploadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;


const PipelineConfigurator = () => {
    const [current, setCurrent] = useState(0);
    const [form] = Form.useForm();
    const [messageInfo, contextHolder] = message.useMessage();
    const [dataFolders, setDataFolders] = useState([]);
    const navigate = useNavigate();

    const ref1 = useRef(null);
    const ref2 = useRef(null);
    const ref3 = useRef(null);
    const ref4 = useRef(null);
    const ref5 = useRef(null);
    const ref6 = useRef(null);

    const [open, setOpen] = useState(false);

    const stepsTour = [
        {
            title: 'Upload File',
            description: 'Put your files here.',
            cover: (
                <img
                    alt="tour.png"
                    src="https://user-images.githubusercontent.com/5378891/197385811-55df8480-7ff4-44bd-9d43-a7dade598d70.png"
                />
            ),
            target: () => ref1.current,
        },
        {
            title: 'Save',
            description: 'Save your changes.',
            target: () => ref2.current,
        },
        {
            title: 'Other Actions',
            description: 'Click to see other actions.',
            target: () => ref3.current,
        },
    ];



    const projectNameValue = Form.useWatch('project_name', form);
    const treeMode = Form.useWatch(['trees', 'mode'], form);
    const treeOutputFormat = Form.useWatch(['trees', 'output_format'], form) || 'nexus';
    const subtreeMinerMode = Form.useWatch(['subtrees', 'subtree_miner'], form);
    const supportFpmaxMode = Form.useWatch(['subtree_mining', 'support_fpmax'], form);

    const [pipelineData, setPipelineData] = useState({
        config: null,
        dataset: null,
    });


    const API_BASE_URL = 'http://localhost:8000';

    const fetchFoldersData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/dataFolders`);
            if (!response.ok) throw new Error("Falha ao carregar dados.");

            const json = await response.json();
            const folders = Array.isArray(json) ? json : [];
            setDataFolders(folders.map((folder) => ({
                value: folder.name,
                label: folder.name
            })));

        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchFoldersData();
    }, []);

    const handleNext = async () => {
        if (current === 0) {
            try {
                const values = await form.validateFields();
                const finalConfig = {
                    general: {
                        project_name: values.project_name,
                        output_dir: `projects/${values.project_name}/out/`,
                        log_file: `projects/${values.project_name}/out/outputs/log_setup_${new Date().toISOString().split('T')[0]}.log`,
                    },

                    subtrees: {
                        ...(values.subtrees || {}),
                        input_format: values.trees?.output_format || 'nexus',
                    },
                    subtree_mining: values.subtree_mining,
                };

                if (values.trees?.mode === 'auto') {
                    finalConfig.trees = {
                        mode: 'auto',
                        ignore_mode: values.trees.ignore_mode,
                        output_format: 'nexus'
                    };
                } else {
                    finalConfig.trees = values.trees;
                }
                finalConfig.subtrees.input_format = finalConfig.trees.output_format;

                setPipelineData(prev => ({ ...prev, config: finalConfig }));
                setCurrent(current + 1);
            } catch (errorInfo) {
                console.log('Falha na validação:', errorInfo);
            }
        } else if (current === 1) {
            if (!pipelineData.dataset) {
                messageInfo.error('Por favor, selecione ou envie um arquivo de dataset.',);
                return;
            }
            setCurrent(current + 1);
        }
    };

    const handlePrev = () => setCurrent(current - 1);

    const handleStartWorkflow = async (projectName) => {
        const finalPayload = convertToFinalFormat(pipelineData);

        console.log(`Iniciando Workflow para o projeto '${projectName}' com os seguintes dados:`, JSON.stringify(finalPayload, null, 2));
        try {
            const response = await fetch(`http://localhost:8000/projects/${projectName}/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ configs: finalPayload }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Erro do servidor: ${response.status}`);
            }

            messageInfo.success('Workflow iniciado! Acompanhe o progresso na página de projetos.');
            navigate('/projects');
        } catch (error) {

            console.error("Falha ao iniciar o workflow:", error);
            messageInfo.error(`Não foi possível iniciar o workflow: ${error.message}`);
        }
    };


    const convertToFinalFormat = (pipelineData) => {
        const { config = {}, dataset = {} } = pipelineData || {};
        const {
            general = {},
            trees = {},
            subtrees = {},
            subtree_mining = {}
        } = config;

        const projectName = general.project_name || 'default_project';
        const outputPath = `./projects/#1/out`;



        const finalFormat = {

            log_file: true,
            project_name: projectName,
            output_log: outputPath,

            tree_config: {
                mode: trees.mode,
                ignore_mode: trees.mode === 'auto' ? (Array.isArray(trees.ignore_mode) ? trees.ignore_mode.join(',') : '') : 'parsimony',
                construct_tree_method: trees.mode === 'manual' ? trees.construct_method : 'distance',
                align_method: trees.mode === 'manual' ? trees.alignment_method : 'mafft',
                input_path: `./data/${dataset.name || 'unknown_dataset.fasta'}`,
                output_path: `${outputPath}/Trees`,
                output_format: trees.output_format || 'nexus',
            },

            subtree_config: {
                construct_tree_method: subtrees.method || 'parsimony',
                input_path: `${outputPath}/Trees`,
                output_path: `${outputPath}/Subtrees`,
                input_format: subtrees.input_format || 'nexus',
                output_format: subtrees.output_format || 'nexus',
                resume_infos: subtrees.resume_infos || false,
                save_metadata: subtrees.save_metadata || false,
                subtree_miner: subtrees.subtree_miner || false,
            }
        };

        if (finalFormat.subtree_config.subtree_miner === true) {
            finalFormat.subtree_config.subtree_miner_configs = {
                mode: subtree_mining.mode ?? 'OFST',
                save_fpmax: subtree_mining.save_fpmax ?? false,
                output_path: `${outputPath}`,

                support_fpmax: subtree_mining.support_fpmax ?? 'auto',
            };
        }

        return finalFormat;
    };

    const renderConfigValue = (value) => {
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (typeof value === 'object' && value !== null) {
            // return <pre style={{ margin: 0 }}>{JSON.stringify(value, null, 4)}</pre>;
            const datas = JSON.stringify(value, null, 4);
            const formattedDatas = Object.entries(value).map(([label, children], index) => {
                return {
                    key: String(index + 1),
                    label: label,
                    children: children,
                };
            });

            console.log('Formatted Datas:', formattedDatas);
            return (
                <Descriptions
                    column={1}
                    bordered
                    size="small"
                    style={{ padding: '8px', marginTop: '8px' }}
                >
                    {formattedDatas.map(item => (
                        <Descriptions.Item key={item.key} label={item.label}>
                            {typeof item.children === 'string' ? item.children : typeof item.children === 'boolean' ? (item.children ? 'yes' : 'no') : item.children}
                        </Descriptions.Item>
                    ))}
                </Descriptions>
            );
        }
        return value || 'Not defined';
    };


    const steps = [
        {
            title: '1. Workflow Configuration',
            status: current === 0 ? 'process' : 'wait',
            description: 'Set the execution parameters.',
            icon: <SettingOutlined />,
            content: (
                <Form form={form} layout="vertical" name="pipeline_config">
                    <Divider ref={ref1} orientation="left" style={{ color: '#ADADADFF' }}>Tree Building Settings</Divider>

                    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} >
                        <Col span={8}>

                            <Form.Item name="project_name" label="Project Name" rules={[{ required: true, message: 'Please enter the project name!' }]}>
                                <Input placeholder="Ex: Analise_Zika_Global" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>

                            <Form.Item label="Log File (Automatically Generated)">
                                <Input value={projectNameValue ? `projects/${projectNameValue}/out/outputs/log_setup_${new Date().toISOString().split('T')[0]}.log` : ''} disabled />
                            </Form.Item>
                        </Col>

                        <Col span={8}>

                            <Form.Item name={['trees', 'mode']} label="Construction Mode" initialValue="auto">
                                <Radio.Group>
                                    <Radio value="auto">Automatic (all combinations)</Radio>
                                    <Radio value="manual">Manual</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                        <Col span={6}>
                            <Form.Item name={['trees', 'ignore_mode']} label="Ignore Methods (Optional)" initialValue="parsimony">
                                <Select mode="multiple" placeholder="Select methods to ignore in auto mode" allowClear>
                                    <Option value="distance">Distance</Option>
                                    <Option value="parsimony">Parsimônia</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>


                    {treeMode === 'manual' && (
                        <Row gutter={24}>
                            <Col span={6}>
                                <Form.Item name={['trees', 'construct_method']} label="Construction Method" initialValue="distance">
                                    <Select>
                                        <Option value="distance"> Distances</Option>
                                        <Option value="parsimony">Parsimony</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={6}><Form.Item name={['trees', 'alignment_method']} label="Alignment Method" initialValue="MAFFT">
                                <Select>
                                    <Option value="mafft">MAFFT</Option>
                                    <Option value="clustalw">ClustalW</Option>
                                </Select>
                            </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item name={['trees', 'input_format']} label="Input Format" initialValue="nexus">
                                    <Select><Option value="nexus">Nexus (.nexus)</Option><Option value="nwk">Newick (.nwk)</Option></Select>
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item name={['trees', 'output_format']} label="Output Format" initialValue="nexus">
                                    <Select><Option value="nexus">Nexus (.nexus)</Option><Option value="nwk">Newick (.nwk)</Option></Select>
                                </Form.Item>
                            </Col>

                        </Row>
                    )}

                    <Divider ref={ref2} orientation="left" style={{ color: '#ADADADFF' }}>Subtree Construction Settings</Divider>

                    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} >
                        <Col span={8}>
                            <Form.Item name={['subtrees', 'method']} label="Construction Method" initialValue="distance">
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
                            <Form.Item name={['subtrees', 'output_format']} label="Output format" initialValue="nexus">
                                <Select><Option value="nexus">Nexus (.nexus)</Option><Option value="nwk">Newick (.nwk)</Option></Select>
                            </Form.Item>

                        </Col>
                    </Row>

                    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} >
                        <Col span={8}>

                            <Form.Item name={['subtrees', 'resume_infos']} valuePropName="checked" initialValue={true}>
                                <Checkbox> Save Subtree Metadata</Checkbox>
                            </Form.Item>
                        </Col>
                        <Col span={8}>

                            <Form.Item name={['subtrees', 'save_metadata']} valuePropName="checked" initialValue={true}>
                                <Checkbox > Save Metadata in JSON</Checkbox>
                            </Form.Item>
                        </Col>

                        <Col span={8}><Form.Item name={['subtrees', 'subtree_miner']} valuePropName="checked" initialValue={true}><Checkbox>Perform Subtree Mining</Checkbox></Form.Item></Col>
                    </Row>
                    {subtreeMinerMode &&
                        (
                            <div>

                                <Divider ref={ref3} orientation="left" style={{ color: '#ADADADFF' }}>Subtree Mining Settings</Divider>

                                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} >
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

                                        <Form.Item name={['subtree_mining', 'save_fpmax']} label="Frequent Subtree Mining" valuePropName="checked" initialValue={true}>
                                            <Checkbox onChange={{}}> Save FPMAX Results</Checkbox>
                                        </Form.Item>

                                    </Col>
                                    <Col span={8}>

                                        <Form.Item name={['subtree_mining', 'support_fpmax']} label="FPMAX Support" initialValue="auto">
                                            <Radio.Group>
                                                <Radio value="auto">Automatic (0.1 a 1.0)</Radio>
                                                <Radio value="manual">Manual</Radio>
                                            </Radio.Group>
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>

                                        {supportFpmaxMode === 'manual' && (
                                            <Form.Item name={['subtree_mining', 'support_value']} label="Support value">
                                                <InputNumber min={0.1} max={1.0} step={0.1} style={{ width: '100%' }} />
                                            </Form.Item>
                                        )}
                                    </Col>
                                </Row>


                            </div>
                        )
                    }
                </Form>
            )
        },
        {
            title: '2. Dataset Selection',
            status: current === 1 ? 'process' : 'wait',
            description: 'Choose an existing dataset or upload a new one.',
            icon: <DatabaseOutlined />,
            content: (
                <Card title="Sequence Data Source">
                    <Select
                        placeholder="Select an existing dataset (Example)"
                        style={{ width: '100%', marginBottom: 24 }}
                        options={dataFolders}
                        onChange={(value) => setPipelineData(prev => ({ ...prev, dataset: { name: value } }))}>
                    </Select>

                    <Text strong>OR</Text>

                    <Upload.Dragger
                        name="file"
                        multiple={false}
                        style={{ marginTop: 16 }}
                        beforeUpload={(file) => {
                            setPipelineData(prev => ({ ...prev, dataset: file }));
                            message.success(`${file.name} selected successfully.`);
                            return false;
                        }}
                        onRemove={() => setPipelineData(prev => ({ ...prev, dataset: null }))}
                    >
                        <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                        <p className="ant-upload-text">Click or drag the .fasta file to this area</p>
                    </Upload.Dragger>
                </Card>
            ),
        },
        {
            title: '3. Review and Start',
            status: current === 2 ? 'process' : 'wait',
            description: 'Confirm the data and start the execution.',
            icon: <RocketOutlined />,
            content: (
                <Card>
                    <Title level={5}>Review Final Settings</Title>
                    {pipelineData.config && (
                        <Descriptions title="Workflow Configuration" bordered column={1} size="small">
                            {Object.entries(pipelineData.config).map(([key, value]) => (
                                <Descriptions.Item key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                                    {renderConfigValue(value)}
                                </Descriptions.Item>
                            ))}
                        </Descriptions>
                    )}
                    {pipelineData.dataset && (
                        <Descriptions title="Dataset" bordered column={1} size="small" style={{ marginTop: 24 }}>
                            <Descriptions.Item label="Selected File">{pipelineData.dataset.name}</Descriptions.Item>
                            {pipelineData.dataset.size && <Descriptions.Item label="Size">{`${(pipelineData.dataset.size / 1024).toFixed(2)} KB`}</Descriptions.Item>}
                        </Descriptions>
                    )}
                </Card>
            ),
        }


    ]

    return (
        <>
            {contextHolder}
            <div
                style={{
                    borderRadius: 8,
                    backgroundColor: '#ffffff',
                    padding: 24
                }}
            >
                <Flex justify='space-between'>

                    <Title level={3}>New workflow settings</Title>
                    <Button type="dashed" onClick={() => setOpen(!open)}>
                        Need help?
                    </Button>
                </Flex>
                <Tour open={open} onClose={() => setOpen(!open)} steps={stepsTour} />

                <Row gutter={32} style={{
                    backgroundColor: '#fff',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    margin: '24px 0',
                    minHeight: '70vh'
                }}>
                    <Col xs={24} md={8} lg={6} style={{
                        backgroundColor: '#E0ECFF96',
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8,
                        padding: 32,
                    }}>
                        <Title level={4} style={{ color: '#000000A8' }}>Steps</Title>
                        <Steps current={current} direction="vertical" items={steps.map(s => ({ title: s.title, description: s.description, status: s.status, icon: s.icon }))} />
                    </Col>
                    <Col xs={24} md={16} lg={18} style={{
                        padding: 32,

                    }}>
                        <div style={{ marginBottom: 64 }} >{steps[current].content}</div>
                        <div style={{ marginTop: 24 }}>
                            {current > 0 && (<Button style={{ margin: '0 8px' }} onClick={handlePrev}>Back</Button>)}
                            {current < steps.length - 1 && (<Button type="primary" onClick={handleNext}>Next</Button>)}
                            {current === steps.length - 1 && (<Button type="primary" icon={<RocketOutlined />} onClick={() => handleStartWorkflow(pipelineData.config?.general.project_name)} disabled={!pipelineData.config || !pipelineData.dataset}>Start Workflow</Button>)}
                        </div>
                    </Col>
                </Row>
            </div>
        </>
    );
};

export default PipelineConfigurator;