import {
    Layout, Typography, Button, Space, Row, Col, Card
} from 'antd';
import {
    ExperimentOutlined, SettingOutlined,
    ShareAltOutlined, GithubOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import HubIcon from '@mui/icons-material/Hub';
const { Header, Content, Sider, Footer } = Layout;
const { Title, Paragraph } = Typography;

import fundo from '../assets/bck1.jpg';
import Logo from './componentsHomepage/logo'
import AppAppBar from './componentsHomepage/appBar';
import Hero from './componentsHomepage/hero';
import Highlights from './componentsHomepage/highlights';
import Features from './componentsHomepage/features';
import FooterComponent from './componentsHomepage/footer';

import Divider from '@mui/material/Divider';
import FAQ from './componentsHomepage/faq';


const HomePage = () => {

    const navigate = useNavigate();

    const handleStartWorking = () => {
        navigate('/projects');
    };
    return (
        <div>

            <Layout style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
                {/* <Header style={{
                    background: '#fff',
                    borderBottom: '1px solid #DADADAFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <a href='/'>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Logo color={'#1890ff'}/>

                            <Title level={4} style={{ marginBottom: 0, marginLeft: 12 }}>PhyloTreeMiner</Title>
                        </div>
                    </a>
                    <Space>
                        <Button type="text" href="#features">Recursos</Button>
                        <Button type="text" href="#about">Sobre</Button>
                        <Button onClick={handleStartWorking}>Acessar Ferramenta</Button>
                    </Space>
                </Header> */}

                <AppAppBar />
                <Hero />
                <Content id='highlights' style={{ padding: '50px', backgroundColor: '#EEFAFF00' }}>

                    {/* <Row align="middle" justify="center" style={{ minHeight: 'calc(100vh - 100px)', textAlign: 'center', }}>
                        <Col>
                            <Title style={{ fontSize: '4rem', marginBottom: 24 }}>
                                Simplificando a Análise Filogenética Complexa
                            </Title>
                            <Paragraph style={{ fontSize: '1.2rem', maxWidth: 800, margin: '0 auto 32px' }}>
                                Uma poderosa ferramenta de e-science projetada para orquestrar, executar e visualizar workflows de análise filogenética de ponta a ponta.
                            </Paragraph>
                            <Space size="large">
                                <Button type="primary" size="large" onClick={handleStartWorking}>
                                    Começar a Trabalhar
                                </Button>
                                <Button size="large" icon={<GithubOutlined />} href="https://github.com/UFFeScience/NMFSt.P" target="_blank">
                                    Saiba Mais no GitHub
                                </Button>
                            </Space>
                        </Col>
                    </Row> */}

                    <div id="features" style={{
                        // padding: '80px 0',
                        // backgroundColor: '#FFFFFFFF',
                        // borderRadius: 8,
                        // boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}>
                        {/* <Title level={2} style={{ textAlign: 'center', marginBottom: 64 }}>Nossos Recursos</Title> */}
                        {/* <Row gutter={[32, 32]} justify="center" style={{}}>
                            <Col>
                                <Card hoverable style={{ width: 400, height: 180 }}>
                                    <Card.Meta
                                        avatar={<SettingOutlined style={{ fontSize: '32px' }} />}
                                        title="Workflows Configuráveis"
                                        description="Crie e execute pipelines complexos com parâmetros detalhados, desde o alinhamento de sequências até a mineração de subárvores."
                                    />
                                </Card>
                            </Col>
                            <Col>
                                <Card hoverable style={{ width: 400, height: 180 }}>
                                    <Card.Meta
                                        avatar={<ShareAltOutlined style={{ fontSize: '32px' }} />}
                                        title="Visualização Interativa"
                                        description="Explore os resultados gerados, visualize árvores filogenéticas e acompanhe os processos em tempo real."
                                    />
                                </Card>
                            </Col>
                            <Col>
                                <Card hoverable style={{ width: 400, height: 180 }}>
                                    <Card.Meta
                                        avatar={<HubIcon style={{ fontSize: '32px' }} />}
                                        title="Neo4j"
                                        description="Consultas no banco de dados em grafos Neo4j."
                                    />
                                </Card>
                            </Col>
                            <Col>
                                <Card hoverable style={{ width: 400, height: 180 }}>
                                    <Card.Meta
                                        avatar={<HubIcon style={{ fontSize: '32px' }} />}
                                        title="Neo4j"
                                        description="Consultas no banco de dados em grafos Neo4j."
                                    />
                                </Card>
                            </Col>
                        </Row> */}
                        <Highlights />
                    </div>
                </Content>
                    <Features />

                    <Divider />
                    {/* <FAQ /> */}
                <Divider />

                <FooterComponent />
                {/* <Footer style={{ textAlign: 'center', background: '#FFFFFFEC', color: '#B4B4B4FF'}}>
                PhyloTreeMiner ©{new Date().getFullYear()} Created by JohKemPo
                </Footer> */}
            </Layout>
        </div>
    );
};

export default HomePage;