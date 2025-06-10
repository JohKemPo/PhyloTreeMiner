import { Card, Row, Col, Button, Alert } from 'antd'
import React from 'react'

export interface JobInfo {
  id: string
  status: 'success' | 'running' | 'failed'
  inicio: string
  duracao: string
  pipeline: string
  regiao: string
  erro?: string
}

interface Props {
  jobs: JobInfo[]
}

const headerColor = {
  success: '#f6ffed',
  running: '#e6f4ff',
  failed: '#fff2f0',
}

const RecentJobsGrid: React.FC<Props> = ({ jobs }) => {
  return (
    <Row gutter={[16,16]}>
      {jobs.map(job => (
        <Col xs={24} md={8} key={job.id}>
          <Card title={job.id} headStyle={{ background: headerColor[job.status] }}>
            <p>Iniciado: {job.inicio}</p>
            <p>Dura\u00e7\u00e3o: {job.duracao}</p>
            <p>Pipeline: {job.pipeline}</p>
            <p>Regi\u00e3o: {job.regiao}</p>
            {job.status === 'failed' && job.erro && (
              <Alert message={job.erro} type="error" showIcon action={<Button icon={<span className="anticon">\u21bb</span>} size="small" />} />
            )}
            <Button type="primary" style={{ marginTop: 8 }}>Ver Detalhes</Button>
          </Card>
        </Col>
      ))}
    </Row>
  )
}

export default RecentJobsGrid
