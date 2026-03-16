import { RouterProvider } from 'react-router';
import { router } from './routes';
import { useEffect } from 'react';
import { initializeSampleData } from './services/initData';

export default function App() {
  useEffect(() => {
    // 初始化示例数据
    initializeSampleData();
  }, []);

  return <RouterProvider router={router} />;
}