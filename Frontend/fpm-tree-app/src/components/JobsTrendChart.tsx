import React, { useMemo } from 'react'
import { Chart } from 'react-charts'

export interface TrendPoint {
  hour: number
  count: number
}

interface Props {
  dataPoints: TrendPoint[]
}

const JobsTrendChart: React.FC<Props> = ({ dataPoints }) => {
  const data = useMemo(
    () => [
      { label: 'Jobs', data: dataPoints.map(d => ({ primary: d.hour, secondary: d.count })) },
    ],
    [dataPoints]
  )

  const primaryAxis = useMemo(() => ({ getValue: (d: any) => d.primary, scaleType: 'linear', min: 8, max: 20 }), [])
  const secondaryAxes = useMemo(() => [{ getValue: (d: any) => d.secondary }], [])

  return (
    <div style={{ height: 200 }}>
      <Chart options={{ data, primaryAxis, secondaryAxes }} />
    </div>
  )
}

export default JobsTrendChart
