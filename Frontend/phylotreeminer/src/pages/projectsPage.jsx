import React, { useState } from "react";
import ProjectDetailView from "../components/displayData/projectDetailsView";
import ProjectGallery from "../components/displayData/projectsGallery";


const ProjectPage = () => {
  const [selectedProject, setSelectedProject] = useState(null);

    const handleProjectSelect = (projectName) => {
        setSelectedProject(projectName);
    };

    return (
        <div style={{
            minWidth: '30vw',
            borderRadius: 8,
            backgroundColor: '#ffffff',
            padding: 24
            
        }}>
            {selectedProject ? (
                <ProjectDetailView
                    projectName={selectedProject}
                    onBack={() => handleProjectSelect(null)}
                />
            ) : (
                <ProjectGallery onProjectSelect={handleProjectSelect} />
            )}
        </div>
    );
}   

export default ProjectPage;