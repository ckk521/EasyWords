import { RouterProvider } from 'react-router';
import { router } from './routes';
import { useEffect } from 'react';
import { initializeSampleData } from './services/initData';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  useEffect(() => {
    // 初始化示例数据
    initializeSampleData();
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}