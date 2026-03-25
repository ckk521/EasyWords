import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  LogOut,
  BookOpen,
  Menu,
  X,
} from "lucide-react";
import { adminStore } from "../../store/adminStore";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  {
    path: "/admin",
    label: "数据概览",
    icon: LayoutDashboard,
    end: true,
  },
  {
    path: "/admin/users",
    label: "用户管理",
    icon: Users,
    end: false,
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const adminUsername = adminStore.getAdminUsername();

  useEffect(() => {
    adminStore.init().then((success) => {
      if (!success) {
        navigate("/admin/login", { replace: true });
      } else {
        setInitialized(true);
      }
    });
  }, [navigate]);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  const handleLogout = () => {
    adminStore.logout();
    navigate("/admin/login");
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-gray-900 text-white transition-all duration-300 ${
          sidebarOpen ? "w-56" : "w-16"
        } flex-shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-700">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="text-sm text-white" style={{ fontWeight: 600 }}>
                EasyWords
              </div>
              <div className="text-xs text-gray-400">管理后台</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-sm">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-gray-700 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-white" style={{ fontWeight: 600 }}>
                  {adminUsername?.[0]?.toUpperCase() || "A"}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm text-white truncate">{adminUsername}</div>
                <div className="text-xs text-gray-400">超级管理员</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                title="退出登录"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
              title="退出登录"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Breadcrumb placeholder */}
          <div className="flex-1 ml-4">
            {/* Breadcrumb rendered by children */}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>管理员：</span>
            <span className="text-gray-800" style={{ fontWeight: 500 }}>
              {adminUsername}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}