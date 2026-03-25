import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Activity,
  Calendar,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminStore, Stats, User, DailyNewUser, ActivityTrend } from "../../api/client";
import { formatDate, getUserStatus } from "../../utils/helpers";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, color, bgColor, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p
            className="mt-1 text-gray-900"
            style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
          <Icon size={20} className={color} />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [dailyNewUsers, setDailyNewUsers] = useState<DailyNewUser[]>([]);
  const [activityTrend, setActivityTrend] = useState<ActivityTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [statsResult, usersResult, dailyResult, trendResult] = await Promise.all([
          adminStore.getStats(),
          adminStore.fetchUsers({ limit: 5 }),
          adminStore.getDailyNewUsers(),
          adminStore.getActivityTrend(),
        ]);

        if (statsResult) {
          setStats(statsResult);
        }
        setRecentUsers(usersResult);
        setDailyNewUsers(dailyResult);
        setActivityTrend(trendResult);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-gray-900">数据概览</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {today} · EasyWords 后台管理系统
          </p>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              title="总用户数"
              value={stats?.totalUsers || 0}
              icon={Users}
              color="text-blue-600"
              bgColor="bg-blue-50"
              subtitle="累计注册"
            />
            <StatCard
              title="今日新增"
              value={stats?.todayNewUsers || 0}
              icon={TrendingUp}
              color="text-green-600"
              bgColor="bg-green-50"
              subtitle={today}
            />
            <StatCard
              title="活跃用户"
              value={stats?.activeUsers || 0}
              icon={UserCheck}
              color="text-emerald-600"
              bgColor="bg-emerald-50"
              subtitle="isActive = true"
            />
            <StatCard
              title="已过期"
              value={stats?.expiredUsers || 0}
              icon={Calendar}
              color="text-amber-600"
              bgColor="bg-amber-50"
              subtitle="expiresAt 已过"
            />
            <StatCard
              title="已禁用"
              value={stats?.disabledUsers || 0}
              icon={UserX}
              color="text-red-600"
              bgColor="bg-red-50"
              subtitle="isActive = false"
            />
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Daily new users */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-gray-800 mb-4" style={{ fontSize: 14, fontWeight: 600 }}>
              近7日新增用户
            </h2>
            {dailyNewUsers.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyNewUsers}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #E5E7EB",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value) => [`${value} 人`, "新增"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#colorCount)"
                    dot={{ fill: "#3B82F6", r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Activity trend */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-gray-800 mb-4" style={{ fontSize: 14, fontWeight: 600 }}>
              近7日用户活动趋势
            </h2>
            {activityTrend.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activityTrend} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #E5E7EB",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend
                    formatter={(value) => {
                      const map: Record<string, string> = {
                        add_word: "查词",
                        add_article: "文章",
                        add_dialogue: "对话",
                        add_conversation: "口语",
                      };
                      return map[value] || value;
                    }}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="add_word" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="add_article" fill="#10B981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="add_dialogue" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="add_conversation" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-gray-800" style={{ fontSize: 14, fontWeight: 600 }}>
              最近注册用户
            </h2>
            <button
              onClick={() => navigate("/admin/users")}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              查看全部
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentUsers.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">暂无用户数据</div>
            ) : (
              recentUsers.map((user) => {
                const status = getUserStatus(user);
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-blue-700" style={{ fontWeight: 600 }}>
                        {user.username[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>
                          {user.username}
                        </span>
                        {user.nickname && (
                          <span className="text-xs text-gray-400">({user.nickname})</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${status.className}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(user.createdAt)}
                      </span>
                      <Activity size={14} className="text-gray-300" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
