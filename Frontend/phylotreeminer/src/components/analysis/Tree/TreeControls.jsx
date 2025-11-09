import { Button, Card, Select, Space } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, ReloadOutlined } from '@ant-design/icons';

const TreeControls = ({
  layout,
  onLayoutChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  metadataKeys,
  colorBy,
  onColorByChange,
}) => {
  return (
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
      <Space direction="vertical" align="start">
        <Card size="small">
          <Space>
            <Button onClick={() => onLayoutChange('rectangular')} type={layout === 'rectangular' ? 'primary' : 'default'}>
              Rectangular
            </Button>
            <Button onClick={() => onLayoutChange('radial')} type={layout === 'radial' ? 'primary' : 'default'}>
              Radial
            </Button>
          </Space>
        </Card>
        <Card size="small">
          <Space>
            <Button icon={<ZoomInOutlined />} onClick={onZoomIn} />
            <Button icon={<ZoomOutOutlined />} onClick={onZoomOut} />
            <Button icon={<ReloadOutlined />} onClick={onResetZoom} />
          </Space>
        </Card>
        {metadataKeys.length > 0 && (
          <Card size="small" title="Color by">
            <Select
              value={colorBy}
              onChange={onColorByChange}
              style={{ width: 150 }}
              options={[
                { value: 'none', label: 'None' },
                ...metadataKeys.map(key => ({ value: key, label: key })),
              ]}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default TreeControls;