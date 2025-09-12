import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom';
import { Button, Result } from 'antd';
import App from './App.jsx'
import ProjectPage from './pages/projectsPage.jsx';
import PipelineConfigurator from './components/configures/pipelineConfigurator.jsx';
import SystemPerformanceMonitor from './components/displayData/systemPerformancerMonitor.jsx';
import TestPage from './pages/testPage.jsx';
import HomePage from './pages/homePage.jsx';
import AnalysisPage from './pages/AnalysisPage.jsx';
import DocumentationHome from './pages/DocumentationHome.jsx';
import SystemHealth from './components/displayData/SystemHealth.jsx';

const NotFoundPage = () => (
  <Result
    status="404"
    title="404"
    subTitle="Sorry, the page you visited has not been implemented yet or does not exist."
    extra={<Button type="primary"><Link to="/">Back to Homepage</Link></Button>}
  />
);

const router = createBrowserRouter([
   {
    path: '/',
    element: <HomePage />, 
    errorElement: NotFoundPage(),
  },
  {
    element: <App />,
    errorElement: NotFoundPage(),
    children: [
      {
        path: 'Dashboards', 
        element: <TestPage/>
      },
      {
        path: 'projects', 
        element: <ProjectPage/>
      },
      {
        path: 'workflow',
        element: <PipelineConfigurator/>
      },
      {
        path: 'analysis',
        element: <AnalysisPage/>
      },
      {
        path: 'doc',
        element: <DocumentationHome/>, 
      },
      {
        path: 'systemHealth',
        element: <SystemHealth/>, 
      },
    ]
  }
]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
