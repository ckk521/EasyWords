import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { Home } from './pages/Home';
import { Vocabulary } from './pages/Vocabulary';
import { Reading } from './pages/Reading';
import { Settings } from './pages/Settings';
import { Articles } from './pages/Articles';
import { Dialogue } from './pages/Dialogue';
import { Dialogues } from './pages/Dialogues';
import { Speak } from './pages/Speak';
import { SpeakConversation } from './pages/SpeakConversation';
import { SpeakHistory } from './pages/SpeakHistory';
import { Login } from './pages/Login';
import { Header } from './components/layout/Header';
import { Toaster } from './components/ui/sonner';
import { WelcomeDialog } from './components/WelcomeDialog';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// 路由守卫组件
function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 未登录，跳转到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 已登录，显示布局
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main><Outlet /></main>
      <Toaster />
      <WelcomeDialog />
    </div>
  );
}

// 登录页布局
function LoginLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 已登录，跳转到首页
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Login />
      <Toaster />
    </>
  );
}

function NotFound() {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-2xl font-semibold mb-4">404 - 页面未找到</h1>
      <a href="/" className="text-blue-600 underline">返回首页</a>
    </div>
  );
}

export const router = createBrowserRouter([
  // 登录页（无需认证）
  {
    path: '/login',
    element: <LoginLayout />,
  },
  // 受保护的路由
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/index.html',
        element: <Home />,
      },
      {
        path: '/vocabulary',
        element: <Vocabulary />,
      },
      {
        path: '/articles',
        element: <Articles />,
      },
      {
        path: '/reading',
        element: <Reading />,
      },
      {
        path: '/dialogue',
        element: <Dialogue />,
      },
      {
        path: '/dialogues',
        element: <Dialogues />,
      },
      {
        path: '/speak',
        element: <Speak />,
      },
      {
        path: '/speak/conversation',
        element: <SpeakConversation />,
      },
      {
        path: '/speak/history',
        element: <SpeakHistory />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
