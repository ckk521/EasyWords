import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { CreateUserModal } from "../../components/admin/CreateUserModal";
import { adminStore, User } from "../../api/client";
import {
  formatDate,
  getUserStatus,
  getExpiresAtDisplay,
} from "../../utils/helpers";

const PAGE_SIZE = 8;

type FilterStatus = "all" | "active" | "expired" | "disabled";

function getStatusFilter(user: User, filter: FilterStatus): boolean {
  if (filter === "all") return true;
  if (filter === "disabled") return !user.isActive;
  if (filter === "expired") {
    return (
      user.isActive &&
      !!user.expiresAt &&
      new Date() > new Date(user.expiresAt)
    );
  }
  if (filter === "active") {
    const notDisabled = user.isActive;
    const notExpired = !user.expiresAt || new Date() <= new Date(user.expiresAt);
    return notDisabled && notExpired;
  }
  return true;
}

export function AdminUsers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);

  // Fetch users from API
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const users = await adminStore.fetchUsers({ limit: 100 });
        setAllUsers(users);
        setTotal(users.length);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter((u) => {
      const matchSearch =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nickname?.toLowerCase().includes(q) ?? false);
      const matchStatus = getStatusFilter(u, statusFilter);
      return matchSearch && matchStatus;
    });
  }, [allUsers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleFilterChange = (val: FilterStatus) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleUserCreated = async () => {
    const users = await adminStore.fetchUsers({ limit: 100 });
    setAllUsers(users);
    setPage(1);
  };

  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: "all", label: "全部", count: allUsers.length },
    {
      key: "active",
      label: "正常",
      count: allUsers.filter((u) => getStatusFilter(u, "active")).length,
    },
    {
      key: "expired",
      label: "已过期",
      count: allUsers.filter((u) => getStatusFilter(u, "expired")).length,
    },
    {
      key: "disabled",
      label: "已禁用",
      count: allUsers.filter((u) => getStatusFilter(u, "disabled")).length,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900">用户管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              管理所有注册用户的权限和状态
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            style={{ fontWeight: 500 }}
          >
            <UserPlus size={15} />
            创建用户
          </button>
        </div>

        {/* Filter & Search */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Status tabs */}
          <div className="flex items-center border-b border-gray-100 px-5">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`flex items-center gap-1.5 py-3.5 mr-6 text-sm border-b-2 transition-colors ${
                  statusFilter === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                style={{ fontWeight: statusFilter === tab.key ? 500 : 400 }}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    statusFilter === tab.key
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}

            {/* Search - right side */}
            <div className="ml-auto flex items-center gap-2 py-2">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="搜索用户名、邮箱..."
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-60 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-sm text-gray-400">加载中...</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                      用户名
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                      邮箱
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                      状态
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                      有效期
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                      注册时间
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                      最后登录
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pageUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-sm text-gray-400">
                        未找到匹配的用户
                      </td>
                    </tr>
                  ) : (
                    pageUsers.map((user) => {
                      const status = getUserStatus(user);
                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                        >
                          {/* Username + nickname */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span
                                  className="text-xs text-blue-700"
                                  style={{ fontWeight: 600 }}
                                >
                                  {user.username[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div
                                  className="text-sm text-gray-900"
                                  style={{ fontWeight: 500 }}
                                >
                                  {user.username}
                                </div>
                                {user.nickname && (
                                  <div className="text-xs text-gray-400">
                                    {user.nickname}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3.5 text-sm text-gray-600">
                            {user.email}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                              />
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </div>
                          </td>

                          {/* expiresAt */}
                          <td className="px-4 py-3.5 text-sm">
                            {user.expiresAt ? (
                              <span
                                className={
                                  new Date() > new Date(user.expiresAt)
                                    ? "text-amber-600"
                                    : "text-gray-600"
                                }
                              >
                                {getExpiresAtDisplay(user.expiresAt)}
                              </span>
                            ) : (
                              <span className="text-gray-400">永久</span>
                            )}
                          </td>

                          {/* createdAt */}
                          <td className="px-4 py-3.5 text-sm text-gray-500">
                            {formatDate(user.createdAt)}
                          </td>

                          {/* lastLoginAt */}
                          <td className="px-4 py-3.5 text-sm text-gray-500">
                            {formatDate(user.lastLoginAt)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/users/${user.id}`);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 transition-colors px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-md"
                              style={{ fontWeight: 500 }}
                            >
                              查看详情
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                共 {filtered.length} 条记录，第 {currentPage} / {totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-xs transition-colors ${
                      p === currentPage
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <CreateUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleUserCreated}
      />
    </AdminLayout>
  );
}
