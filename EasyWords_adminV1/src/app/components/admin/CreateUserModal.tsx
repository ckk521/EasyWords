import { useState, useEffect, useRef } from "react";
import { X, User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, AtSign } from "lucide-react";
import { adminStore } from "../../api/client";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  global?: string;
}

// Validation helpers
function validateUsername(val: string): string | undefined {
  if (!val.trim()) return "用户名不能为空";
  if (val.length < 3 || val.length > 20) return "用户名长度须在 3–20 个字符之间";
  if (!/^[a-zA-Z0-9_]+$/.test(val)) return "用户名只能包含字母、数字和下划线";
  return undefined;
}

function validateEmail(val: string): string | undefined {
  if (!val.trim()) return "邮箱不能为空";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "邮箱格式不正确";
  return undefined;
}

function validatePassword(val: string): string | undefined {
  if (!val) return "密码不能为空";
  if (val.length < 6 || val.length > 20) return "密码长度须在 6–20 个字符之间";
  return undefined;
}

function validateConfirmPassword(val: string, password: string): string | undefined {
  if (!val) return "请再次输入密码";
  if (val !== password) return "两次输入的密码不一致";
  return undefined;
}

export function CreateUserModal({ open, onClose, onCreated }: CreateUserModalProps) {
  const [form, setForm] = useState<FormState>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    nickname: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm({ username: "", email: "", password: "", confirmPassword: "", nickname: "" });
      setErrors({});
      setSuccessMsg("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (errors.global) {
      setErrors((prev) => ({ ...prev, global: undefined }));
    }
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    errs.username = validateUsername(form.username);
    errs.email = validateEmail(form.email);
    errs.password = validatePassword(form.password);
    errs.confirmPassword = validateConfirmPassword(form.confirmPassword, form.password);

    const hasError = Object.values(errs).some(Boolean);
    setErrors(errs);
    return !hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await adminStore.createUser({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        nickname: form.nickname.trim(),
      });

      setSubmitting(false);

      if (!result.success) {
        setErrors({ global: result.error });
        return;
      }

      setSuccessMsg(`用户 "${form.username}" 创建成功`);
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1000);
    } catch (error) {
      setSubmitting(false);
      setErrors({ global: '创建用户失败，请稍后重试' });
    }
  };

  if (!open) return null;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-gray-900" style={{ fontSize: 16, fontWeight: 600 }}>
              创建用户
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">为新用户创建账号，初始权限全部开放</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {/* Global error */}
            {errors.global && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{errors.global}</span>
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                <CheckCircle size={15} className="flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                用户名 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <AtSign
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={firstInputRef}
                  type="text"
                  value={form.username}
                  onChange={(e) => setField("username", e.target.value)}
                  placeholder="3–20 个字符，字母/数字/下划线"
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.username ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  autoComplete="off"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                邮箱 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="example@domain.com"
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.email ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  autoComplete="off"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                初始密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="6–20 个字符"
                  className={`w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.password ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                确认密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  placeholder="请再次输入密码"
                  className={`w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.confirmPassword ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Nickname (optional) */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                昵称
                <span className="text-gray-400 ml-1" style={{ fontWeight: 400 }}>（选填）</span>
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={form.nickname}
                  onChange={(e) => setField("nickname", e.target.value)}
                  placeholder="用户显示名称"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Default permission hint */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-600">
                <span style={{ fontWeight: 500 }}>默认权限：</span>查词、阅读、对话/听力、AI陪练 全部开放 · 有效期：永久
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              style={{ fontWeight: 500 }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !!successMsg}
              className="px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
              style={{ fontWeight: 500 }}
            >
              {submitting ? "创建中..." : "创建用户"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
