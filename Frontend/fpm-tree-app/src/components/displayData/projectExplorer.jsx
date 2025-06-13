import React, { useState, useEffect, useCallback } from 'react';
import { Layout,
     Select,
     List,
     Typography,
     Breadcrumb,
     Alert,
     Space,
     Modal,
     Spin,
     Card } from 'antd';
import { FolderOutlined,
     FileOutlined,
     HomeOutlined } from '@ant-design/icons';
import TreeViewer from './treeViewer';

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const { Option } = Select;


const ProjectExplorer = ({ initialProjectName = null }) => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(initialProjectName);
    const [currentPath, setCurrentPath] = useState(initialProjectName || '');

    const [directoryContent, setDirectoryContent] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [preview, setPreview] = useState({ visible: false, item: null });
    const [previewContent, setPreviewContent] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const API_BASE_URL = 'http://localhost:8000';

    useEffect(() => {
        const fetchProjects = async () => {
            if (initialProjectName) return; 

            setIsLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/projects`);
                if (!response.ok) throw new Error('Falha ao buscar projetos.');
                const data = await response.json();
                setProjects(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProjects();
    }, [initialProjectName]);

    const fetchDirectoryContent = useCallback(async (path) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/browse?path=${encodeURIComponent(path)}`);
            if (!response.ok) throw new Error((await response.json()).detail || 'Falha ao buscar conteúdo.');
            setDirectoryContent(await response.json());
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
                try {
                    const response = await fetch(`${API_BASE_URL}/file?path=${encodeURIComponent(preview.item.path)}`);
                    if (!response.ok) throw new Error((await response.json()).detail || 'Falha ao buscar arquivo.');
                    setPreviewContent((await response.json()).content);
                } catch (err) { setPreviewContent(`Erro: ${err.message}`); }
                finally { setIsPreviewLoading(false); }
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
        const homeTarget = initialProjectName ? initialProjectName : null;
        return [<Breadcrumb.Item key="home"><a onClick={() => handleProjectSelect(homeTarget)}><HomeOutlined /></a></Breadcrumb.Item>, ...items];
    };

    const renderPreviewContent = () => {
        if (!preview.item) return null;
        if (/\.(jpe?g|png|gif|svg|webp)$/i.test(preview.item.name)) {
            return <img src={`${API_BASE_URL}/file?path=${encodeURIComponent(preview.item.path)}`} alt={preview.item.name} style={{ maxWidth: '100%' }} />;
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
    <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            {!initialProjectName && (
                <Select
                    showSearch
                    placeholder="Selecione um Projeto"
                    style={{ width: '100%' }}
                    value={selectedProject}
                    onChange={handleProjectSelect}
                    allowClear
                >
                    {projects.map((proj) => <Option key={proj.name} value={proj.name}>{proj.name}</Option>)}
                </Select>
            )}

            {selectedProject && (
                <>
                    <Breadcrumb>{generateBreadcrumbItems()}</Breadcrumb>
                    {error && <Alert message="Erro" description={error} type="error" showIcon />}
                    <List
                        loading={isLoading}
                        itemLayout="horizontal"
                        dataSource={directoryContent}
                        renderItem={(item) => (
                            <List.Item onClick={() => handleItemClick(item)} style={{ cursor: 'pointer', padding: '8px' }}>
                                <List.Item.Meta
                                    avatar={item.type === 'directory' ? <FolderOutlined /> : <FileOutlined />}
                                    title={<Typography.Text ellipsis>{item.name}</Typography.Text>}
                                />
                            </List.Item>
                        )}
                        locale={{ emptyText: 'Esta pasta está vazia.' }}
                        style={{ maxHeight: '50vh', overflow: 'auto' }}
                    />
                </>
            )}
        </Space>

        {preview.item && (
            <Modal title={`Visualizando: ${preview.item.name}`} open={preview.visible} onCancel={handleCloseModal} footer={null} width="80vw">
                <div style={{ height: '70vh', overflowY: 'auto', paddingTop: '16px' }}>
                    {isPreviewLoading ? <Spin size="large" /> : renderPreviewContent()}
                </div>
            </Modal>
        )}
    </Card>
);

};
export default ProjectExplorer;