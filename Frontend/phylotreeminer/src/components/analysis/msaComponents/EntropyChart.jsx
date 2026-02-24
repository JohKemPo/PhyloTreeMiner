import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card, Typography } from 'antd';

const EntropyChart = ({ data }) => {
//   data esperado: conservationData [{ conservation, gap, index }]
  return (
    <Card size="small" title="Variação de Entropia (Shannon) por Posição" style={{ marginTop: 16 }}>
      <div style={{ height: 200, width: '100%' }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="index" hide />
            <YAxis domain={[0, 1]} tick={{fontSize: 12}} />
            <Tooltip labelFormatter={(value) => `Posição: ${value}`} />
            <Area 
              type="monotone" 
              dataKey="conservation" 
              stroke="#2a9d8f" 
              fill="#2a9d8f" 
              fillOpacity={0.3} 
              name="Conservação"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default EntropyChart;