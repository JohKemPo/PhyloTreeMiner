import { Card } from 'antd';

const Legend = ({ colorScale }) => {
  if (!colorScale) return null;

  const domain = colorScale.domain();
  const title = colorScale.name || 'Legend';

  return (
    <Card size="small" title={title} style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 10, maxWidth: '200px' }}>
      {domain.map((value, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{
            width: '15px',
            height: '15px',
            backgroundColor: colorScale(value),
            marginRight: '8px',
            borderRadius: '50%',
          }}/>
          <span style={{ fontSize: '12px' }}>{value}</span>
        </div>
      ))}
    </Card>
  );
};

export default Legend;