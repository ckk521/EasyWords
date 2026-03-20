import { Link, useLocation } from 'react-router';
import { BookOpen, Library, FileText, Settings, Newspaper, Headphones, Mic } from 'lucide-react';

export function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '查词', icon: BookOpen },
    { path: '/vocabulary', label: '生词本', icon: Library },
    { path: '/articles', label: '生词阅读', icon: Newspaper },
    { path: '/dialogues', label: '生词会话', icon: Headphones },
    { path: '/speak', label: '口语陪练', icon: Mic },
    { path: '/settings', label: '设置', icon: Settings }
  ];

  const isActive = (path: string) => {
    if (path === '/articles') {
      return location.pathname === '/articles' || location.pathname === '/reading';
    }
    if (path === '/dialogues') {
      return location.pathname === '/dialogues' || location.pathname === '/dialogue';
    }
    if (path === '/speak') {
      return location.pathname.startsWith('/speak');
    }
    return location.pathname === path;
  };

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="size-6 text-blue-600" />
            <span className="font-semibold text-xl">EasyWords</span>
          </Link>

          <nav className="flex gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
