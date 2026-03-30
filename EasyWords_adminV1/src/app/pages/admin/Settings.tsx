import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Loader2, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { settingsApi, MODEL_PROVIDERS, ModelProvider, tokenManager } from "../../api/client";

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);

  // 表单数据
  const [apiProvider, setApiProvider] = useState<ModelProvider | ''>('');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');

  // 加载设置
  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const token = tokenManager.get();
        if (!token) return;

        const result = await settingsApi.get(token);
        if (result.success && result.data) {
          setApiProvider(result.data.apiProvider || '');
          setBaseURL(result.data.baseURL || '');
          setModel(result.data.model || '');
          // API Key 是脱敏的，显示占位符
          if (result.data.apiKey) {
            setApiKey(''); // 不显示脱敏的 key，让用户重新输入
          }
        }
      } catch (e) {
        console.error('加载设置失败:', e);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  // 供应商变化时自动填充默认值
  const handleProviderChange = (provider: ModelProvider | '') => {
    setApiProvider(provider);
    if (provider && MODEL_PROVIDERS[provider]) {
      const config = MODEL_PROVIDERS[provider];
      setBaseURL(config.defaultBaseUrl);
      setModel(config.defaultModel);
    } else {
      setBaseURL('');
      setModel('');
    }
  };

  // 保存设置
  const handleSave = async () => {
    if (!apiProvider) {
      setError('请选择模型供应商');
      return;
    }
    if (!apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }
    if (!baseURL.trim()) {
      setError('请输入 Base URL');
      return;
    }
    if (!model.trim()) {
      setError('请输入 Model Name');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);
    setVerifyResult(null);

    try {
      const token = tokenManager.get();
      if (!token) return;

      const result = await settingsApi.update(token, {
        apiProvider,
        apiKey: apiKey.trim(),
        baseURL: baseURL.trim(),
        model: model.trim(),
      });

      if (result.success) {
        setSuccess(true);
        setApiKey(''); // 清空 API Key 输入框
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || '保存失败');
      }
    } catch (e) {
      setError('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  // 校验 API 配置
  const handleVerify = async () => {
    if (!apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }

    setVerifying(true);
    setError(null);
    setVerifyResult(null);

    try {
      const token = tokenManager.get();
      if (!token) return;

      const result = await settingsApi.verify(token, {
        apiProvider: apiProvider || undefined,
        apiKey: apiKey.trim(),
        baseURL: baseURL.trim() || undefined,
        model: model.trim() || undefined,
      });

      if (result.success && result.data) {
        setVerifyResult({
          valid: result.data.valid,
          message: result.data.valid
            ? result.data.message || 'API 配置有效'
            : result.data.error || 'API 配置无效',
        });
      } else {
        setVerifyResult({
          valid: false,
          message: result.error || '校验失败',
        });
      }
    } catch (e) {
      setVerifyResult({
        valid: false,
        message: '校验失败，请检查网络连接',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-gray-900 text-xl font-semibold">配置</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            管理系统全局配置
          </p>
        </div>

        {/* 配置内容 */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button className="px-5 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              模型配置
            </button>
          </div>

          {/* 表单内容 */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">加载中...</span>
              </div>
            ) : (
              <div className="space-y-6 max-w-xl">
                {/* 模型供应商 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    模型供应商
                  </label>
                  <select
                    value={apiProvider}
                    onChange={(e) => handleProviderChange(e.target.value as ModelProvider | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">请选择供应商</option>
                    {Object.entries(MODEL_PROVIDERS).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="请输入 API Key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    请妥善保管您的 API Key，它将被加密存储
                  </p>
                </div>

                {/* Base URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={baseURL}
                    onChange={(e) => setBaseURL(e.target.value)}
                    placeholder="如 https://api.deepseek.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {apiProvider && MODEL_PROVIDERS[apiProvider]?.defaultBaseUrl && (
                    <p className="mt-1 text-xs text-gray-500">
                      默认: {MODEL_PROVIDERS[apiProvider].defaultBaseUrl}
                    </p>
                  )}
                </div>

                {/* Model Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="如 deepseek-chat"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {apiProvider && MODEL_PROVIDERS[apiProvider]?.defaultModel && (
                    <p className="mt-1 text-xs text-gray-500">
                      默认: {MODEL_PROVIDERS[apiProvider].defaultModel}
                    </p>
                  )}
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* 成功提示 */}
                {success && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    保存成功
                  </div>
                )}

                {/* 校验结果提示 */}
                {verifyResult && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    verifyResult.valid
                      ? 'bg-green-50 text-green-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {verifyResult.valid ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    {verifyResult.message}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleVerify}
                    disabled={verifying || !apiKey.trim()}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        校验中...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        校验
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        保存配置
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
