import { Link, useLocation, useNavigate } from 'react-router';
import { BookOpen, Library, FileText, Settings, Newspaper, Headphones, Mic, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getStoredUserApiStatus } from '../../services/auth';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 获取用户 API 权限状态
  const userApiStatus = getStoredUserApiStatus();
  const canAccessSettings = userApiStatus?.canUseOwnApi ?? false;

  const allNavItems = [
    { path: '/', label: '查词', icon: BookOpen },
    { path: '/vocabulary', label: '生词本', icon: Library },
    { path: '/articles', label: '生词阅读', icon: Newspaper },
    { path: '/dialogues', label: '生词会话', icon: Headphones },
    { path: '/speak', label: '口语陪练', icon: Mic },
    { path: '/settings', label: '设置', icon: Settings, requireSettingsAccess: true }
  ];

  // 根据权限过滤导航项
  const navItems = allNavItems.filter(item => {
    if (item.requireSettingsAccess) {
      return canAccessSettings;
    }
    return true;
  });

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

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate('/login');
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="size-6 text-blue-600" />
            <span className="font-semibold text-xl">EasyWords</span>
          </Link>

          <div className="flex items-center gap-4">
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

            {/* 用户信息 */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="size-4 text-blue-600" />
                  </div>
                  <span className="hidden sm:inline text-gray-700 font-medium">
                    {user.nickname || user.username}
                  </span>
                  <ChevronDown className={`size-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* 下拉菜单 */}
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="font-medium text-gray-900">{user.nickname || user.username}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="size-4" />
                      <span>退出登录</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
