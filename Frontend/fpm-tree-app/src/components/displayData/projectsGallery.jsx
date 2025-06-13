import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Typography, Button, Space, Select, Input, Alert, Spin, Tag } from 'antd';
import { CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, CloseCircleOutlined, FilterOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const ProjectGallery = ({ onProjectSelect }) => {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const API_BASE_URL = 'http://localhost:8000';

    const fetchJobsData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [projectsRes, statusRes] = await Promise.all([
                fetch(`${API_BASE_URL}/projects`),
                fetch(`${API_BASE_URL}/projects/status`)
            ]);
            if (!projectsRes.ok || !statusRes.ok) throw new Error("Falha ao carregar dados dos jobs.");
            const projectsData = await projectsRes.json();
            const statusData = await statusRes.json();
            
            const combinedData = projectsData.map(p => ({ ...p, status: statusData[p.name] || 'idle' }));
            setProjects(combinedData);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJobsData();
    }, [fetchJobsData]);

    const statusMap = {
        completed: { color: 'green', icon: <CheckCircleOutlined />, text: 'Concluído' },
        running: { color: 'blue', icon: <SyncOutlined spin />, text: 'Em Execução' },
        idle: { color: 'gold', icon: <ClockCircleOutlined />, text: 'Aguardando' },
        failed: { color: 'red', icon: <CloseCircleOutlined />, text: 'Falha' }
    };
    
    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        (statusFilter === 'all' || p.status === statusFilter)
    );

    return (
        <div>
            <Title level={3}>Projetos Recentes</Title>
            <Card style={{marginBottom: 24}}>
                 <Row justify="space-between" align="middle" gutter={[16, 16]}>
                     <Col flex="auto"><Search placeholder="Buscar pelo nome do job..." onChange={(e) => setSearchTerm(e.target.value)} /></Col>
                     <Col><Space><FilterOutlined /><Select defaultValue="all" style={{ width: 150 }} onChange={(value) => setStatusFilter(value)}><Option value="all">Todos</Option><Option value="running">Em Execução</Option><Option value="completed">Concluído</Option><Option value="idle">Aguardando</Option></Select></Space></Col>
                 </Row>
            </Card>

            {isLoading && <div style={{textAlign: 'center', padding: 50}}><Spin size="large"/></div>}
            {error && <Alert message="Erro" description={error} type="error" showIcon />}
            
            <Row gutter={[24, 24]}>
                {filteredProjects.length > 0 ? filteredProjects.map(job => (
                    <Col xs={24} sm={12} lg={8} key={job.name}>
                        <Card hoverable title={<Text ellipsis={{tooltip: job.name}}>{job.name}</Text>} extra={<Tag color={statusMap[job.status]?.color} icon={statusMap[job.status]?.icon}>{statusMap[job.status]?.text}</Tag>}>
                            <Space direction="vertical" style={{width: '100%'}}>
                                <Row justify="space-between"><Text type="secondary">Iniciado</Text><Text>{new Date(job.last_modified).toLocaleString('pt-BR')}</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Duração</Text><Text>--</Text></Row>
                            </Space>
                            <Button type="primary" ghost block style={{marginTop: 24}} onClick={() => onProjectSelect(job.name)}>Ver Detalhes</Button>
                        </Card>
                    </Col>
                )) : !isLoading && <Col span={24} style={{textAlign: 'center', padding: 50}}><Empty description="Nenhum job encontrado com os filtros aplicados." /></Col>}
            </Row>
        </div>
    );
};

export default ProjectGallery;