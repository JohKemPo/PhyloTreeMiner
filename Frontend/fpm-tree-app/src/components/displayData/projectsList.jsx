import { useEffect, useState } from 'react';
import { List, Select, Divider, Flex } from 'antd';
import SourceIcon from '@mui/icons-material/Source';
import CardProject from './cardProject';


const ProjectsList = ({ projects }) => {



    const handleChange = (value) => {
        console.log(`selected ${value}`);
    };

    return (
        <div style={{
            width: '100%',
            // display: 'flex',
            // justifyContent: 'center',
            // alignItems: 'center',
            // margin: 20,
            padding: 20,
            backgroundColor:"red"
        }}>
            <Flex
                wrap 
                gap="small"
                justify={'space-around'}
                // align={'center'}
                style={{
                    // width: '80%',
                    // maxHeight: '30%',
                    // borderRadius: 6,
                    // overflow: 'auto',
                }}

            >

                {projects.map((project, index) => (
                    <CardProject key={index} project={project} />
                ))}
            </Flex>
        </div>
    );
}
export default ProjectsList;