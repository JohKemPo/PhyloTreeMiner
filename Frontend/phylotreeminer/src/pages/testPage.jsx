import React from 'react';
import { Layout, FloatButton, Result } from 'antd';
import { CommentOutlined, QuestionOutlined } from '@ant-design/icons';
import { colors } from '../themes';
import mock from '../assets/mock.png'

const TestPage = () => {
    return (
        <div
            style={{
                minHeight: '80vh',
                borderRadius: 8,
                backgroundColor: '#ffffff',
                padding: 24

            }}
        >
            <>
                <div style={{width:'100%',alignContent:'center', alignItems:'center'}}>
                    <img src={mock}></img>
                </div>
                <FloatButton.Group
                    trigger="click"
                    // type="primary"
                    style={{ insetInlineEnd: 24, marginRight: 24 }}
                    icon={<QuestionOutlined />}

                    tooltip="Ajuda"
                    placement='top'

                // badge={{
                //     // dot: true,
                //     count: '?',
                //     style: { backgroundColor: `${colors.data.orange}` },
                // }}
                >
                    <FloatButton />
                    <FloatButton icon={<CommentOutlined />} />
                </FloatButton.Group>

            </>
        </div>
    );
}


export default TestPage;
