import React, { useState } from 'react';
import { Button, Result } from 'antd';
import ProjectsList from './components/displayData/projectsList';


function App() {


  return (
    <div >
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={<Button type="primary">Back Home</Button>}
      />

      <ProjectsList/>
    </div>
  );
}

export default App;