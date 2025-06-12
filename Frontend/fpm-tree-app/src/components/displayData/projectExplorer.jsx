import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Select, List, Typography, Breadcrumb, Alert, Space, Modal, Spin } from 'antd';
import { FolderOutlined, FileOutlined, HomeOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const { Option } = Select;

import TreeViewer from './treeViewer';

const ProjectExplorer = ({ }) => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [currentPath, setCurrentPath] = useState('');
    const [directoryContent, setDirectoryContent] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [preview, setPreview] = useState({ visible: false, item: null });
    const [previewContent, setPreviewContent] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);


    const API_BASE_URL = 'http://localhost:8000';

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/projects`);
                if (!response.ok) throw new Error('Falha ao buscar projetos.');
                const data = await response.json();
                setProjects(data.sort());
            } catch (err) {
                setError(err.message);
            }
        };
        fetchProjects();
    }, []);

    const fetchDirectoryContent = useCallback(async (path) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/browse?path=${path}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Falha ao buscar conteúdo do diretório.');
            }
            const data = await response.json();
            setDirectoryContent(data);
        } catch (err) {
            setError(err.message);
            setDirectoryContent([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentPath) {
            fetchDirectoryContent(currentPath);
        } else {
            setDirectoryContent([]);
        }
    }, [currentPath, fetchDirectoryContent]);

    useEffect(() => {
        if (!preview.visible || !preview.item) return;

        const isImage = /\.(jpe?g|png|gif|svg|webp)$/i.test(preview.item.name);

        if (!isImage) {
            const fetchContent = async () => {
                setIsPreviewLoading(true);
                setPreviewContent('');
                try {
                    const response = await fetch(`${API_BASE_URL}/file?path=${preview.item.path}`);
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.detail || 'Falha ao buscar conteúdo do arquivo.');
                    }
                    const data = await response.json();
                    setPreviewContent(data.content);
                } catch (err) {
                    setPreviewContent(`Erro ao carregar o arquivo: ${err.message}`);
                } finally {
                    setIsPreviewLoading(false);
                }
            };
            fetchContent();
        }
    }, [preview]);

    const handleProjectSelect = (projectName) => {
        setSelectedProject(projectName);
        setCurrentPath(projectName || '');
    };

    const handleItemClick = (item) => {
        if (item.type === 'directory') {
            setCurrentPath(item.path);
        } else {
            setPreview({ visible: true, item: item });
        }
    };

    const handleBreadcrumbClick = (pathToGo) => {
        setCurrentPath(pathToGo);
    };

    const handleCloseModal = () => {
        setPreview({ visible: false, item: null });
        setPreviewContent('');
    };

    const generateBreadcrumbItems = () => {
        if (!currentPath) return [<Breadcrumb.Item key="home"><HomeOutlined /> Raiz</Breadcrumb.Item>];
        const pathParts = currentPath.split('/');
        let accumulatedPath = '';
        const items = pathParts.map((part, index) => {
            accumulatedPath = index === 0 ? part : `${accumulatedPath}/${part}`;
            const isLast = index === pathParts.length - 1;
            const pathToNavigate = accumulatedPath;
            return (
                <Breadcrumb.Item key={pathToNavigate}>
                    {isLast ? <span>{part}</span> : <a onClick={() => handleBreadcrumbClick(pathToNavigate)}>{part}</a>}
                </Breadcrumb.Item>
            );
        });
        return [<Breadcrumb.Item key="home"><a onClick={() => handleProjectSelect(null)}><HomeOutlined /></a></Breadcrumb.Item>, ...items];
    };

    const renderPreviewContent = () => {
        if (!preview.item) return null;

        const isImage = /\.(jpe?g|png|gif|svg|webp)$/i.test(preview.item.name);
        if (isImage) {
            const imageUrl = `${API_BASE_URL}/file?path=${encodeURIComponent(preview.item.path)}`;
            return <img src={imageUrl} alt={preview.item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', margin: 'auto', display: 'block' }} />;
        }




        const isNexus = /\.nexus$/i.test(preview.item.name);
        if (isNexus) {
            return <div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{previewContent}</pre>
                <TreeViewer content={previewContent} />
            </div>
        }

        return <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{previewContent}</pre>;
    };


    return (
        <Layout
            style={{
                backgroundColor: '#F3F8FF00',
                minHeight: '80vh'
            }}>

            <Content style={{ padding: '24px 50px' }}>
                <div style={{ maxWidth: '35%', margin: '0 auto', background: '#fff', padding: 24, borderRadius: 8 }}>
                    <header style={{ marginBottom: '32px' }}>
                        <Title level={2}>Explorador de Projetos</Title>
                        <Paragraph type="secondary">Navegue pela estrutura de arquivos dos seus projetos.</Paragraph>
                    </header>

                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Select
                            showSearch
                            placeholder="Selecione um Projeto"
                            style={{ width: '100%' }}
                            value={selectedProject}
                            onChange={handleProjectSelect}
                            filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                            allowClear
                        >
                            {projects.map((proj) => <Option key={proj.name} value={proj.name}>{proj.name}</Option>)}
                        </Select>

                        {selectedProject && (
                            <>
                                <Breadcrumb>{generateBreadcrumbItems()}</Breadcrumb>
                                {error && <Alert message="Erro" description={error} type="error" showIcon />}
                                <List
                                    loading={isLoading}
                                    itemLayout="horizontal"
                                    dataSource={directoryContent}
                                    renderItem={(item) => (
                                        <List.Item
                                            onClick={() => handleItemClick(item)}
                                            style={{ cursor: 'pointer', padding: '12px', borderRadius: '4px' }}
                                            className={'hover-bg'}
                                        >
                                            <List.Item.Meta
                                                avatar={item.type === 'directory' ? <FolderOutlined style={{ fontSize: '20px', color: '#1890ff' }} /> : <FileOutlined style={{ fontSize: '20px' }} />}
                                                title={item.name}
                                                description={`${(item.size / 1024).toFixed(2)} KB`}
                                            />
                                            <div>{new Date(item.last_modified).toLocaleDateString()}</div>
                                        </List.Item>
                                    )}
                                    locale={{ emptyText: 'Esta pasta está vazia.' }}
                                    style={{
                                        maxHeight: '30vh', overflow: 'auto'
                                    }}
                                />
                            </>
                        )}
                    </Space>
                </div>
            </Content>
            {preview.item && (
                <Modal
                    title={`Visualizando: ${preview.item.name}`}
                    open={preview.visible}
                    onCancel={handleCloseModal}
                    footer={null}
                    width="100vw"
                    destroyOnClose
                >
                    <div style={{ height: '70vh', overflowY: 'auto', paddingTop: '16px' }}>
                        {isPreviewLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <Spin size="large" />
                            </div>
                        ) : (renderPreviewContent())}
                    </div>
                </Modal>
            )}
        </Layout>
    );
}


export default ProjectExplorer;