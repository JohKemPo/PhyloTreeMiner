import React, { useState, useEffect, useRef } from 'react';
import { Button, Col, Row, Typography } from 'antd';
import ProjectExplorer from '../displayData/projectExplorer';

const { Title } = Typography;

const ProjectDetailView = ({ projectName, onBack }) => {
    const [logs, setLogs] = useState([]);
    const logContainerRef = useRef(null);

    useEffect(() => {
        if (!projectName) return;
        const wsUrl = `ws://localhost:8000/ws/progress/${encodeURIComponent(projectName)}`;
        const socket = new WebSocket(wsUrl);
        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            setLogs(prevLogs => [...prevLogs, msg]);
            // console.log(`Received log for ${projectName}:`, msg);
        };
        return () => socket.close();
    }, [projectName]);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const logColorMap = {
        INFO: 'white',
        WARNING: '#faad14',
        ERROR: '#f5222d',
        RAW: '#8c8c8c'
    };
    
    return (
        <div>
            <Button onClick={onBack} style={{ marginBottom: 24 }}>← Return to Job Gallery</Button>
            <Title level={3}>Project Details: {projectName}</Title>
            <Row gutter={24}>
                <Col xs={24} md={10}>
                    <Title level={4}>File Explorer</Title>
                    <ProjectExplorer initialProjectName={projectName} />
                </Col>
                <Col xs={24} md={14}>
                    <Title level={4}>Real-Time Logs</Title>
                    <div ref={logContainerRef} style={{height: 600, overflowY: 'auto', backgroundColor: '#262626', color: 'white', padding: 16, borderRadius: 8, fontFamily: 'monospace'}}>
                        {logs.map((log, index) => (
                            <div key={index}>
                                {log.type === 'status_update' && <p style={{color: '#87d068'}}>{`[SYSTEM] ${log.message}`}</p>}
                                {log.type === 'progress_update' && <p><span style={{color: '#8c8c8c'}}>{log.payload.timestamp}</span><span style={{color: logColorMap[log.payload.level], margin: '0 8px'}}>[{log.payload.level}]</span><span>{log.payload.message}</span></p>}
                                {log.type === 'workflow_complete' && <p style={{color: '#52c41a', fontWeight: 'bold'}}>{`[SUCCESS] ${log.message}`}</p>}
                                {log.type === 'error' && <p style={{color: '#ff4d4f', fontWeight: 'bold'}}>{`[ERROR] ${log.message}`}</p>}
                            </div>
                        ))}
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default ProjectDetailView;