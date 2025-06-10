import { Card, Progress, Row, Col } from 'antd'
import React from 'react'

export interface PerfProps {
  cpu: number
  memory: number
  disk: number
  network: number
  uptime: string
  jobs: string
}

const SystemPerformanceCard: React.FC<PerfProps> = ({ cpu, memory, disk, network, uptime, jobs }) => {
  return (
    <Card title="Performance do Sistema">
      <Row gutter={[8,8]}>
        <Col span={24}><Progress percent={cpu} format={(p) => `CPU ${p}%`} /></Col>
        <Col span={24}><Progress percent={memory} format={(p) => `Mem\u00f3ria ${p}%`} /></Col>
        <Col span={24}><Progress percent={disk} format={(p) => `Disco ${p}%`} /></Col>
        <Col span={24}><Progress percent={network} format={(p) => `Rede ${p}%`} /></Col>
      </Row>
      <Row style={{ marginTop: 16 }} justify="space-between">
        <span>Tempo de atividade: {uptime}</span>
        <span>Jobs processados: {jobs}</span>
      </Row>
    </Card>
  )
}

export default SystemPerformanceCard
