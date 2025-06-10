import React, { useState } from 'react';
import { Button, Result } from 'antd';


function App() {


  return (
    <div>
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={<Button type="primary">Back Home</Button>}
      />
    </div>
  );
}

export default App;