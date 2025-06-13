import React, { useState, useEffect, useRef } from 'react';
import { Card, Progress, Space, Typography, Tooltip } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
const { Text } = Typography;

const SystemPerformanceMonitor = () => {
    const [metrics, setMetrics] = useState({ cpu: 0, memory: 0, disk: 0, network: 0 });
    const [isConnected, setIsConnected] = useState(false);
    const socket = useRef(null);

    const connect = () => {
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
            return;
        }

        socket.current = new WebSocket('ws://localhost:8000/ws/system-performance');

        socket.current.onopen = () => {
            setIsConnected(true);
        };

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMetrics(data);
        };

        socket.current.onclose = () => {
            setIsConnected(false);
        };

        socket.current.onerror = (error) => {
            console.error("Erro no WebSocket de performance:", error);
            setIsConnected(false);
        };
    };

    useEffect(() => {
        connect();
        return () => {
            if (socket.current) {
                socket.current.close();
            }
        };
    }, []);

    const statusColor = isConnected ? '#52c41a' : '#f5222d';

    return (
        <Card
            title="Performance do Sistema"
            size="small"
            extra={
                <Tooltip title={isConnected ? "Conectado" : "Desconectado. Clique para tentar reconectar."}>
                    <ApiOutlined style={{ color: statusColor, cursor: 'pointer' }} onClick={connect} />
                </Tooltip>
            }
            style={{ 
                // position: 'fixed', 
                // bottom: 24, 
                // right: 24, 
                width: 300, 
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
            }}
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                    <Text>CPU</Text>
                    <Progress percent={metrics.cpu} strokeColor={{ from: '#108ee9', to: '#87d068' }} />
                </div>
                <div>
                    <Text>Memória</Text>
                    <Progress percent={metrics.memory} />
                </div>
                <div>
                    <Text>Disco</Text>
                    <Progress percent={metrics.disk} status="active" strokeColor={{ from: '#108ee9', to: '#87d068' }}  />
                </div>
                {/* <div>
                    <Text>Rede</Text>
                    <Progress percent={metrics.network} status="exception" />
                </div> */}
            </Space>
        </Card>
    );
};

export default SystemPerformanceMonitor;
