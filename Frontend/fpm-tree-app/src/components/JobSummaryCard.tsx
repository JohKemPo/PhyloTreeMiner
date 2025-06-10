import { Card, Statistic, Row, Col } from 'antd'
import { Chart } from 'react-charts'
import React, { useMemo } from 'react'

export interface WeeklyData {
  day: string
  completed: number
  running: number
  failed: number
}

export interface JobSummaryProps {
  total: number
  concluidos: number
  emExecucao: number
  falhas: number
  dadosSemanais: WeeklyData[]
}

const JobSummaryCard: React.FC<JobSummaryProps> = ({ total, concluidos, emExecucao, falhas, dadosSemanais }) => {
  const data = useMemo(
    () => [
      { label: 'Conclu\u00eddos', data: dadosSemanais.map(d => ({ primary: d.day, secondary: d.completed })) },
      { label: 'Em Execu\u00e7\u00e3o', data: dadosSemanais.map(d => ({ primary: d.day, secondary: d.running })) },
      { label: 'Falhas', data: dadosSemanais.map(d => ({ primary: d.day, secondary: d.failed })) },
    ],
    [dadosSemanais]
  )

  const primaryAxis = useMemo(() => ({ getValue: (datum: any) => datum.primary }), [])
  const secondaryAxes = useMemo(() => [{ getValue: (datum: any) => datum.secondary }], [])

  return (
    <Card title="Resumo de Jobs">
      <Row gutter={16}>
        <Col span={6}><Statistic title="Total" value={total} /></Col>
        <Col span={6}><Statistic title="Conclu\u00eddos" value={concluidos} valueStyle={{ color: 'green' }} /></Col>
        <Col span={6}><Statistic title="Em Execu\u00e7\u00e3o" value={emExecucao} valueStyle={{ color: 'blue' }} /></Col>
        <Col span={6}><Statistic title="Falhas" value={falhas} valueStyle={{ color: 'red' }} /></Col>
      </Row>
      <div style={{ height: 200, marginTop: 16 }}>
        <Chart options={{ data, primaryAxis, secondaryAxes }} />
      </div>
    </Card>
  )
}

export default JobSummaryCard
