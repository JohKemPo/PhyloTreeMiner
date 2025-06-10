import { Row, Col, Select } from 'antd'
import React, { useMemo } from 'react'
import { Chart } from 'react-charts'
import { useMediaQuery } from '../hooks'

interface Props {
  period: string
  region: string
}

const periodOptions = [
  { value: '7d', label: '\u00daltimos 7 dias' },
  { value: '30d', label: 'M\u00eas' },
]

const regionOptions = [
  { value: 'all', label: 'Todas as regi\u00f5es' },
  { value: 'sa', label: 'Am\u00e9rica do Sul' },
  { value: 'eu', label: 'Europa' },
]

const AnalysisStats: React.FC = () => {
  const isSmall = useMediaQuery('(max-width: 768px)')

  const barData = useMemo(
    () => [
      { label: 'Localiza\u00e7\u00e3o A', data: [{ primary: 'A', secondary: 3 }] },
      { label: 'Localiza\u00e7\u00e3o B', data: [{ primary: 'B', secondary: 5 }] },
    ],
    []
  )

  const areaData = useMemo(
    () => [
      { label: 'Suporte M\u00e9dio', data: [{ primary: 'Tree1', secondary: 50 }] },
      { label: 'Suporte M\u00e1ximo', data: [{ primary: 'Tree1', secondary: 80 }] },
    ],
    []
  )

  const primaryAxis = useMemo(() => ({ getValue: (d: any) => d.primary }), [])
  const secondaryAxes = useMemo(() => [{ getValue: (d: any) => d.secondary }], [])

  const layout = (
    <Row gutter={16} wrap={!isSmall}>
      <Col xs={24} md={12}>
        <Chart options={{ data: barData, primaryAxis, secondaryAxes }} />
      </Col>
      <Col xs={24} md={12}>
        <Chart options={{ data: areaData, primaryAxis, secondaryAxes }} />
      </Col>
    </Row>
  )

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Select defaultValue="7d" options={periodOptions} />
        </Col>
        <Col>
          <Select defaultValue="all" options={regionOptions} />
        </Col>
      </Row>
      {layout}
    </div>
  )
}

export default AnalysisStats
