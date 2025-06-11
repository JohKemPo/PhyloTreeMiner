import React, { useState } from 'react';
import { EditOutlined, EllipsisOutlined, SettingOutlined, FolderOutlined } from '@ant-design/icons';
import { Card } from 'antd';
const actions = [
    <EditOutlined key="edit" />,
    <SettingOutlined key="setting" />,
    <EllipsisOutlined key="ellipsis" />,
];

const CardProject = ({ project, id }) => {

    return (
        <Card actions={actions} style={{ minWidth: 300 }}>
            <Card.Meta
                avatar={<FolderOutlined style={{ fontSize: '24px' }} />}
                title={project.label}
                description={
                    <>
                        <p><b>Última modificação:</b> {project.timestamp.split('T')[0]}</p>
                    </>
                }
            />
        </Card>

    );
}

export default CardProject; 