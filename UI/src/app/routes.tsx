import { createBrowserRouter } from 'react-router';
import { Home } from './pages/Home';
import { Vocabulary } from './pages/Vocabulary';
import { Reading } from './pages/Reading';
import { Settings } from './pages/Settings';
import { Articles } from './pages/Articles';
import { Header } from './components/layout/Header';
import { Toaster } from './components/ui/sonner';
import { WelcomeDialog } from './components/WelcomeDialog';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
      <Toaster />
      <WelcomeDialog />
    </div>
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
  {
    path: '/',
    element: (
      <Layout>
        <Home />
      </Layout>
    ),
  },
  {
    path: '/vocabulary',
    element: (
      <Layout>
        <Vocabulary />
      </Layout>
    ),
  },
  {
    path: '/articles',
    element: (
      <Layout>
        <Articles />
      </Layout>
    ),
  },
  {
    path: '/reading',
    element: (
      <Layout>
        <Reading />
      </Layout>
    ),
  },
  {
    path: '/settings',
    element: (
      <Layout>
        <Settings />
      </Layout>
    ),
  },
  {
    path: '*',
    element: (
      <Layout>
        <NotFound />
      </Layout>
    ),
  },
]);