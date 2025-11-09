import { EditOutlined, EllipsisOutlined, SettingOutlined, FolderOutlined } from '@ant-design/icons';
import { Card } from 'antd';

const actions = [
    <EditOutlined key="edit" />,
    <SettingOutlined key="setting" />,
    <EllipsisOutlined key="ellipsis" />,
];

const CardProject = ({ project, id }) => {

    return (
        
        <Card actions={actions} style={{ minWidth: 300 }} title={project.name} extra={<FolderOutlined />}>
            <Card.Meta
                // avatar={}
                // title={project.name}
                description={
                    <>
                        <p><b>Última modificação:</b> {project.last_modified.split('T')[0]}</p>
                    </>
                }
            />
        </Card>

    );
}

export default CardProject; 