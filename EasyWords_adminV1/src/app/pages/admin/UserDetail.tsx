import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronLeft,
  Save,
  CheckCircle,
  XCircle,
  User as UserIcon,
  Shield,
  Activity,
  Clock,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminStore, User, LoginLog, Activity as ActivityType } from "../../api/client";
import {
  formatDate,
  formatDateOnly,
  getUserStatus,
  getActionLabel,
  getActionColor,
  parseDetails,
} from "../../utils/helpers";

// ---- Tab types ----
type TabKey = "info" | "permission" | "activities" | "login-logs";

// ---- Expiry mode ----
type ExpiryMode = "permanent" | "days" | "date" | "minutes";

// ---- BasicInfo Tab ----
function BasicInfoTab({ user, onResetPassword }: { user: User; onResetPassword: () => Promise<void> }) {
  const status = getUserStatus(user);
  const [resetting, setResetting] = useState(false);

  const handleResetPassword = async () => {
    if (!confirm('确定要将该用户的密码重置为 111111 吗？')) return;
    setResetting(true);
    try {
      await onResetPassword();
      alert('密码已重置为: 111111');
    } finally {
      setResetting(false);
    }
  };

  const fields = [
    { label: "用户 ID", value: user.id },
    { label: "用户名", value: user.username },
    { label: "邮箱", value: user.email },
    { label: "昵称", value: user.nickname || "-" },
    { label: "注册时间", value: formatDate(user.createdAt) },
    { label: "最后登录时间", value: formatDate(user.lastLoginAt) },
    {
      label: "有效期",
      value: user.expiresAt ? formatDate(user.expiresAt) : "永久",
    },
    {
      label: "账号状态",
      value: (
        <span className={`px-2 py-0.5 rounded-full text-xs ${status.className}`}>
          {status.label}
        </span>
      ),
    },
    {
      label: "连续登录失败次数",
      value: (
        <span className={user.loginFailCount >= 5 ? "text-red-600" : "text-gray-700"}>
          {user.loginFailCount} 次
          {user.loginFailCount >= 5 && " (已锁定)"}
        </span>
      ),
    },
    {
      label: "锁定到期时间",
      value: user.loginLockedUntil ? (
        <span className="text-amber-600">{formatDate(user.loginLockedUntil)}</span>
      ) : (
        "-"
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
            基本信息
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center px-5 py-3.5">
              <span className="w-40 text-sm text-gray-500 flex-shrink-0">{f.label}</span>
              <span className="text-sm text-gray-800">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Password */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
            密码管理
          </h3>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">重置用户密码</p>
              <p className="text-xs text-gray-400 mt-0.5">重置后密码将变为: 111111</p>
            </div>
            <button
              onClick={handleResetPassword}
              disabled={resetting}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm transition-colors"
            >
              <KeyRound size={14} />
              {resetting ? "重置中..." : "重置密码"}
            </button>
          </div>
        </div>
      </div>

      {/* Module permissions summary */}
      {user.permission && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
              模块权限概览
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-4 p-5">
            {[
              { key: "vocabulary", label: "查词功能" },
              { key: "reading", label: "阅读功能" },
              { key: "dialogue", label: "对话/听力" },
              { key: "speak", label: "AI陪练" },
            ].map(({ key, label }) => {
              const enabled = user.permission![key as keyof typeof user.permission] as boolean;
              return (
                <div
                  key={key}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${
                    enabled
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {enabled ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : (
                    <XCircle size={20} className="text-gray-400" />
                  )}
                  <span className="text-xs text-gray-600" style={{ fontWeight: 500 }}>
                    {label}
                  </span>
                  <span
                    className={`text-xs ${enabled ? "text-green-600" : "text-gray-400"}`}
                  >
                    {enabled ? "已开启" : "已关闭"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Permission Tab ----
function PermissionTab({
  user,
  onSaved,
}: {
  user: User;
  onSaved: () => void;
}) {
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>(() => {
    // 优先使用数据库中存储的 expiryMode
    if (user.expiryMode === 'permanent' || user.expiryMode === 'days' || user.expiryMode === 'date' || user.expiryMode === 'minutes') {
      return user.expiryMode as ExpiryMode;
    }
    // 兼容旧数据：没有 expiryMode 时根据 expiresAt 推断
    if (!user.expiresAt) return "permanent";
    return "date";
  });
  const [daysValue, setDaysValue] = useState("30");
  const [minutesValue, setMinutesValue] = useState("3");
  const [dateValue, setDateValue] = useState(
    user.expiresAt ? formatDateOnly(user.expiresAt) : ""
  );

  const [vocabulary, setVocabulary] = useState(
    user.permission?.vocabulary ?? true
  );
  const [reading, setReading] = useState(user.permission?.reading ?? true);
  const [dialogue, setDialogue] = useState(user.permission?.dialogue ?? true);
  const [speak, setSpeak] = useState(user.permission?.speak ?? true);
  const [isActive, setIsActive] = useState(user.isActive);
  const [canUseOwnApi, setCanUseOwnApi] = useState(user.canUseOwnApi ?? false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 记录上一次的用户ID，用于检测用户切换
  const prevUserIdRef = useRef<string>(user.id);

  // 当切换用户时，重新初始化状态
  useEffect(() => {
    if (prevUserIdRef.current !== user.id) {
      prevUserIdRef.current = user.id;
      // 重置为用户数据的初始状态
      setVocabulary(user.permission?.vocabulary ?? true);
      setReading(user.permission?.reading ?? true);
      setDialogue(user.permission?.dialogue ?? true);
      setSpeak(user.permission?.speak ?? true);
      setIsActive(user.isActive);
      setCanUseOwnApi(user.canUseOwnApi ?? false);
      if (user.expiresAt) {
        setDateValue(formatDateOnly(user.expiresAt));
      } else {
        setDateValue("");
      }
      // 使用数据库中的 expiryMode，或根据 expiresAt 推断
      if (user.expiryMode === 'permanent' || user.expiryMode === 'days' || user.expiryMode === 'date' || user.expiryMode === 'minutes') {
        setExpiryMode(user.expiryMode as ExpiryMode);
      } else {
        // 兼容旧数据
        setExpiryMode(user.expiresAt ? "date" : "permanent");
      }
    }
  }, [user.id, user.permission, user.isActive, user.canUseOwnApi, user.expiresAt, user.expiryMode]);

  const computeExpiresAt = (): string | null => {
    if (expiryMode === "permanent") return null;
    if (expiryMode === "days") {
      const days = parseInt(daysValue) || 30;
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString();
    }
    if (expiryMode === "minutes") {
      const mins = parseInt(minutesValue) || 3;
      const d = new Date();
      d.setMinutes(d.getMinutes() + mins);
      return d.toISOString();
    }
    if (expiryMode === "date") {
      if (!dateValue) return null;
      return new Date(dateValue).toISOString();
    }
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    console.log('handleSave: starting...');
    try {
      const expiresAt = computeExpiresAt();
      console.log('handleSave: expiresAt:', expiresAt, 'expiryMode:', expiryMode, 'isActive:', isActive, 'canUseOwnApi:', canUseOwnApi);

      const userResult = await adminStore.updateUser(user.id, { isActive, expiresAt, expiryMode, canUseOwnApi });
      console.log('handleSave: userResult:', userResult);

      const permResult = await adminStore.updatePermission(user.id, {
        vocabulary,
        reading,
        dialogue,
        speak,
      });
      console.log('handleSave: permResult:', permResult);

      if (!userResult && !permResult) {
        console.error('handleSave: Save failed - both returned null/false');
        setError('保存失败，请检查登录状态');
        return;
      }

      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('handleSave error:', err);
      setError('保存失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const modules = [
    { key: "vocabulary", label: "查词功能", state: vocabulary, setState: setVocabulary },
    { key: "reading", label: "阅读功能", state: reading, setState: setReading },
    { key: "dialogue", label: "对话/听力", state: dialogue, setState: setDialogue },
    { key: "speak", label: "AI陪练", state: speak, setState: setSpeak },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Expiry */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
            用户有效期
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">设置账号的使用期限</p>
        </div>
        <div className="p-5 space-y-3">
          {/* Permanent */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="expiry"
              checked={expiryMode === "permanent"}
              onChange={() => setExpiryMode("permanent")}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">永久</span>
          </label>

          {/* Days */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="expiry"
              checked={expiryMode === "days"}
              onChange={() => setExpiryMode("days")}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">指定天数：</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="3650"
                value={daysValue}
                onChange={(e) => setDaysValue(e.target.value)}
                disabled={expiryMode !== "days"}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <span className="text-sm text-gray-500">天</span>
              {expiryMode === "days" && daysValue && (
                <span className="text-xs text-gray-400">
                  (到期：{formatDateOnly(computeExpiresAt())})
                </span>
              )}
            </div>
          </label>

          {/* Date */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="expiry"
              checked={expiryMode === "date"}
              onChange={() => setExpiryMode("date")}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">指定日期：</span>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              disabled={expiryMode !== "date"}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              min={new Date().toISOString().split("T")[0]}
            />
          </label>

          {/* Minutes */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="expiry"
              checked={expiryMode === "minutes"}
              onChange={() => setExpiryMode("minutes")}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">体验时长：</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="60"
                value={minutesValue}
                onChange={(e) => setMinutesValue(e.target.value)}
                disabled={expiryMode !== "minutes"}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <span className="text-sm text-gray-500">分钟</span>
            </div>
          </label>
        </div>
      </div>

      {/* Module permissions */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
            模块权限
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">控制用户可访问的功能模块</p>
        </div>
        <div className="p-5 space-y-3">
          {modules.map(({ key, label, state, setState }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{label}</span>
              <button
                onClick={() => setState(!state)}
                className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${
                  state ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    state ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Account status */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
            账号状态
          </h3>
        </div>
        <div className="p-5 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="isActive"
              checked={isActive}
              onChange={() => setIsActive(true)}
              className="w-4 h-4 accent-blue-600"
            />
            <div>
              <span className="text-sm text-gray-700">启用</span>
              <p className="text-xs text-gray-400">用户可以正常登录使用</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="isActive"
              checked={!isActive}
              onChange={() => setIsActive(false)}
              className="w-4 h-4 accent-blue-600"
            />
            <div>
              <span className="text-sm text-gray-700">禁用</span>
              <p className="text-xs text-gray-400">用户登录时将提示"账号已被禁用"</p>
            </div>
          </label>
        </div>
      </div>

      {/* API Configuration Permission */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
            API 配置权限
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">允许用户配置自己的大模型 API</p>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-700">允许使用自己的 API</span>
              <p className="text-xs text-gray-400 mt-0.5">开启后，用户可以在设置页面配置自己的大模型 API</p>
            </div>
            <button
              onClick={() => setCanUseOwnApi(!canUseOwnApi)}
              className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${
                canUseOwnApi ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  canUseOwnApi ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm transition-colors"
            style={{ fontWeight: 500 }}
          >
            <Save size={15} />
            {saving ? "保存中..." : "保存设置"}
          </button>
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle size={16} />
              <span>保存成功</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Activities Tab ----
function ActivitiesTab({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true);
      try {
        const data = await adminStore.getActivities(userId);
        setActivities(data);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, [userId]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">加载中...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
          用户活动记录
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          记录用户的添加操作（单词、文章、对话、口语）
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          暂无活动记录
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-5 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  时间
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  操作类型
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  资源类型
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  详情
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activities.map((act) => (
                <tr key={act.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {formatDate(act.createdAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${getActionColor(act.action)}`}
                    >
                      {getActionLabel(act.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">
                    {act.resourceType || "-"}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">
                    {parseDetails(act.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Login Logs Tab ----
function LoginLogsTab({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const data = await adminStore.getLoginLogs(userId);
        setLogs(data);
      } catch (error) {
        console.error('Failed to fetch login logs:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [userId]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">加载中...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
          登录日志
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          记录所有登录行为，包括成功与失败
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          暂无登录记录
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-5 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  登录时间
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  登录用户名
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  状态
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  失败原因
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  IP 地址
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-700">
                    {log.username}
                  </td>
                  <td className="px-4 py-3.5">
                    {log.status === "success" ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-600">
                        <CheckCircle size={13} />
                        成功
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-600">
                        <XCircle size={13} />
                        失败
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">
                    {log.failReason || "-"}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">
                    {log.ipAddress || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Main Component ----
export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      if (id) {
        setLoading(true);
        console.log('fetchUser: fetching user', id, 'token:', adminStore.getToken() ? 'exists' : 'missing');
        try {
          const found = await adminStore.getUserById(id);
          console.log('fetchUser: result:', found);
          setUser(found);
        } catch (error) {
          console.error('Failed to fetch user:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          加载中...
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          用户不存在
        </div>
      </AdminLayout>
    );
  }

  const status = getUserStatus(user);

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "info", label: "基本信息", icon: UserIcon },
    { key: "permission", label: "权限设置", icon: Shield },
    { key: "activities", label: "活动记录", icon: Activity },
    { key: "login-logs", label: "登录日志", icon: Clock },
  ];

  const handlePermissionSaved = async () => {
    console.log('handlePermissionSaved called, id:', id);
    if (id) {
      const updated = await adminStore.getUserById(id);
      console.log('handlePermissionSaved: updated user:', updated);
      if (updated) {
        setUser(updated);
        console.log('handlePermissionSaved: user state updated');
      }
    }
  };

  const handleResetPassword = async () => {
    if (!id) return;
    const result = await adminStore.resetPassword(id);
    if (!result.success) {
      alert('重置密码失败');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/users")}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm text-blue-700" style={{ fontWeight: 600 }}>
                {user.username[0].toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-gray-900">{user.username}</h1>
                {user.nickname && (
                  <span className="text-sm text-gray-400">({user.nickname})</span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs ${status.className}`}>
                  {status.label}
                </span>
                {user.loginLockedUntil && new Date() < new Date(user.loginLockedUntil) && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600">
                    <AlertTriangle size={11} />
                    账号已锁定
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex border-b border-gray-100 px-2">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm border-b-2 transition-colors mr-1 ${
                  activeTab === key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                style={{ fontWeight: activeTab === key ? 500 : 400 }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {activeTab === "info" && (
              <BasicInfoTab user={user} onResetPassword={handleResetPassword} />
            )}
            {activeTab === "permission" && (
              <PermissionTab user={user} onSaved={handlePermissionSaved} />
            )}
            {activeTab === "activities" && <ActivitiesTab userId={user.id} />}
            {activeTab === "login-logs" && <LoginLogsTab userId={user.id} />}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
