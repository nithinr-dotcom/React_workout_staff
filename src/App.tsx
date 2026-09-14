import { createBrowserRouter, RouterProvider } from 'react-router';
import { Layout } from './shell/Layout';
import { Dashboard } from './shell/Dashboard';
import { Roadmap } from './shell/Roadmap';
import { TaskPage } from './shell/TaskPage';
import { MockInterview } from './shell/MockInterview';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'roadmap', element: <Roadmap /> },
      { path: 'mock', element: <MockInterview /> },
      { path: 'tasks/:taskId', element: <TaskPage /> },
      { path: '*', element: <p style={{ padding: 24 }}>Not found.</p> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
