import { useEffect, useState } from 'react';
import { List, Select, Divider, Flex } from 'antd';
import SourceIcon from '@mui/icons-material/Source';
import CardProject from './cardProject';


const ProjectsList = () => {
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        fetch('http://localhost:8000/projects')
            .then(response => response.json())
            .then(data => setProjects(data))
            .catch(error => console.error('Error fetching projects:', error));
    }, []);

    const handleChange = (value) => {
        console.log(`selected ${value}`);
    };

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Flex
                wrap gap="small"
                justify={'space-around'} 
                align={'center'}
                style={{
                    width: '90%',
                    maxHeight: '30%',
                    borderRadius: 6,
                    margin: 20,
                    padding: 20,
                    overflow: 'auto',
                    backgroundColor: '#F3F8FFFF',
                }}

            >

                {projects.map((project, index) => (
                    <CardProject key={index} project={project} />
                ))}
            </Flex>
            {/* <Divider/>
            <h2>Projects List</h2>
            <Select
                style={{ width: 200, marginTop: 20 }}
                onChange={handleChange}
                placeholder="Select a project"
                options={projects}
            />
            <Divider/>
            <h2>Projects List</h2>
            <List
                itemLayout="horizontal"
                dataSource={projects}
                renderItem={(item, index) => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<SourceIcon />}
                            title={<a href="https://ant.design">{item.label}</a>}
                        // description="Ant Design, a design language for background applications, is refined by Ant UED Team"
                        />
                    </List.Item>
                )}
            /> */}
        </div>
    );
}
export default ProjectsList;