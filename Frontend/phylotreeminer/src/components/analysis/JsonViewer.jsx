import { useState } from 'react';
import { Typography } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';

const { Text, Link } = Typography;

const JsonEntry = ({ entryKey, entryValue, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  let value = entryValue;
  if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
    try {
      value = JSON.parse(value);
      isJsonString = true;
    } catch (e) {  }
  }

  const isObject = typeof value === 'object' && value !== null;

  const toggleExpand = () => setIsExpanded(!isExpanded);

  if (isObject) {
    const entries = Object.entries(value);
    const bracket = Array.isArray(value) ? ['[', ']'] : ['{', '}'];

    return (
      <div>
        <Text strong>
          {!isRoot && (
            <Link onClick={toggleExpand} style={{ marginRight: '5px' }}>
              {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            </Link>
          )}
          {!isRoot && `"${entryKey}": `}
          {bracket[0]}
          {!isExpanded && <Text type="secondary"> ... </Text>}
        </Text>
        
        {isExpanded && (
          <div style={{ marginLeft: isRoot ? '0' : '20px', borderLeft: isRoot ? 'none' : '1px solid #e0e0e0', paddingLeft: '10px' }}>
            {entries.map(([key, val]) => (
              <JsonEntry key={key} entryKey={key} entryValue={val} />
            ))}
          </div>
        )}

        <Text strong>{bracket[1]}</Text>
      </div>
    );
  } else {
    const isLink = typeof value === 'string' && value.startsWith('http');
    const valueColor = typeof value === 'number' ?  '#0C8286FF' : '#0C3D86FF';

    return (
      <div>
        <Text strong>"{entryKey}": </Text>
        {isLink ? (
          <Link href={value} target="_blank">"{value}"</Link>
        ) : (
          <Text style={{ color: valueColor }}>{JSON.stringify(value)}</Text>
        )}
      </div>
    );
  }
};

const JsonViewer = ({ data }) => {
  if (data === null || data === undefined) return null;

  return (
    <div style={{ 
      background: '#F8F8F8FF', 
      padding: '16px', 
      borderRadius: '6px', 
      maxHeight: '400px', 
      overflowY: 'auto',
      fontFamily: 'monospace',
      lineHeight: '1.8'
    }}>
      <JsonEntry entryKey="root" entryValue={data} isRoot={true} />
    </div>
  );
};

export default JsonViewer;