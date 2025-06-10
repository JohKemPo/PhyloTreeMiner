import React, { useState } from 'react'
import { ConfigProvider, theme, Switch, Row, Col } from 'antd'
import DashboardLayout from './components/DashboardLayout'
import JobSummaryCard from './components/JobSummaryCard'
import JobsTrendChart from './components/JobsTrendChart'
import SystemPerformanceCard from './components/SystemPerformanceCard'
import RecentJobsGrid from './components/RecentJobsGrid'
import AnalysisStats from './components/AnalysisStats'

function App() {
  const [dark, setDark] = useState(false)

  const week = [
    { day: 'Seg', completed: 5, running: 2, failed: 1 },
    { day: 'Ter', completed: 3, running: 1, failed: 0 },
    { day: 'Qua', completed: 8, running: 0, failed: 2 },
    { day: 'Qui', completed: 2, running: 3, failed: 1 },
    { day: 'Sex', completed: 6, running: 1, failed: 0 },
    { day: 'Sab', completed: 4, running: 0, failed: 0 },
    { day: 'Dom', completed: 1, running: 0, failed: 0 },
  ]

  const jobs = [
    { id: 'job1', status: 'success', inicio: '10:00', duracao: '5m', pipeline: 'P1', regiao: 'SA' },
    { id: 'job2', status: 'running', inicio: '10:10', duracao: '3m', pipeline: 'P2', regiao: 'EU' },
    { id: 'job3', status: 'failed', inicio: '09:50', duracao: '2m', pipeline: 'P3', regiao: 'SA', erro: 'Error example' },
  ] as const

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#1890ff', borderRadius: 6 },
      }}
    >
      <Switch
        checked={dark}
        onChange={setDark}
        checkedChildren="Dark"
        unCheckedChildren="Light"
        style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}
      />
      <DashboardLayout>
        <Row gutter={[16,16]}>
          <Col span={24}><JobSummaryCard total={30} concluidos={25} emExecucao={3} falhas={2} dadosSemanais={week} /></Col>
          <Col span={24}><JobsTrendChart dataPoints={[{ hour: 8, count: 1 }, { hour: 10, count: 3 }, { hour: 14, count: 5 }]} /></Col>
          <Col span={24}><SystemPerformanceCard cpu={40} memory={50} disk={30} network={10} uptime="12d 4h 35m" jobs="1.248" /></Col>
          <Col span={24}><RecentJobsGrid jobs={jobs as any} /></Col>
          <Col span={24}><AnalysisStats /></Col>
        </Row>
      </DashboardLayout>
    </ConfigProvider>
  )
}

export default App
