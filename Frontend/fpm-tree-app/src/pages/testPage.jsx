import React from 'react';
import { Layout, FloatButton, Result } from 'antd';
import { CommentOutlined, QuestionOutlined } from '@ant-design/icons';
import { colors } from '../themes';


const TestPage = () => {
    return (
        <div
            style={{
                // height: '100vh',
                
            }}
        >
            <>
                <FloatButton.Group
                    trigger="click"
                    // type="primary"
                    style={{ insetInlineEnd: 24, marginRight: 24 }}
                    icon={<QuestionOutlined/>}
                    
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
