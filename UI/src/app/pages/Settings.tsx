import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { api, ApiConfig, SettingsStatus } from '../services/api';
import { Key, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [settings, setSettings] = useState<SettingsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      // 如果有保存的配置，预填充
      if (data.baseURL) setBaseURL(data.baseURL);
      if (data.model) setModel(data.model);
    } catch (error) {
      toast.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error('请输入 API Key');
      return;
    }

    setSaving(true);
    try {
      const config: ApiConfig = {
        apiKey: apiKey.trim(),
        baseURL: baseURL.trim() || undefined,
        model: model.trim() || undefined,
      };
      await api.saveApiConfig(config);
      setSettings({
        hasApiKey: true,
        apiProvider: 'custom',
        baseURL: baseURL.trim() || null,
        model: model.trim() || null,
      });
      setApiKey('');
      toast.success('配置保存成功');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteApiKey();
      setSettings({
        hasApiKey: false,
        apiProvider: null,
        baseURL: null,
        model: null,
      });
      setBaseURL('');
      setModel('');
      toast.success('配置已删除');
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      toast.error('请输入 API Key');
      return;
    }

    setVerifying(true);
    try {
      const config: ApiConfig = {
        apiKey: apiKey.trim(),
        baseURL: baseURL.trim() || undefined,
        model: model.trim() || undefined,
      };
      const isValid = await api.verifyApiConfig(config);
      if (isValid) {
        toast.success('API 配置验证成功');
      } else {
        toast.error('API 配置无效');
      }
    } catch (error) {
      toast.error('验证失败');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-semibold mb-6">设置</h1>

      <div className="space-y-6">
        {/* API 配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-5" />
              API 配置
            </CardTitle>
            <CardDescription>
              配置 API 以使用查词和文章生成功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 状态显示 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">状态：</span>
              {settings?.hasApiKey ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="size-3" />
                  已配置
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <XCircle className="size-3" />
                  未配置
                </Badge>
              )}
            </div>

            {/* API Key 输入 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                API Key <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="请输入您的 API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                您的 API Key 将加密存储在本地，不会上传到服务器
              </p>
            </div>

            {/* Base URL 输入 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Base URL
              </label>
              <Input
                type="text"
                placeholder="例如: https://api.openai.com/v1"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                留空使用默认值
              </p>
            </div>

            {/* Model 输入 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                模型名称
              </label>
              <Input
                type="text"
                placeholder="例如: gpt-4, glm-4, glm-5"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                留空使用默认模型
              </p>
            </div>

            {/* 当前配置显示 */}
            {settings?.hasApiKey && (settings.baseURL || settings.model) && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-2">当前配置：</p>
                {settings.baseURL && (
                  <p className="text-xs text-gray-600">Base URL: {settings.baseURL}</p>
                )}
                {settings.model && (
                  <p className="text-xs text-gray-600">模型: {settings.model}</p>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !apiKey.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleVerify}
                disabled={verifying || !apiKey.trim()}
              >
                {verifying ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    验证中...
                  </>
                ) : (
                  '验证'
                )}
              </Button>

              {settings?.hasApiKey && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                >
                  删除配置
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <div>
              <h4 className="font-medium mb-1">1. 获取 API Key</h4>
              <p className="text-gray-600">
                从您的 AI 服务提供商获取 API Key（如智谱 AI、OpenAI 等）
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">2. 配置 API</h4>
              <p className="text-gray-600">
                填写 API Key，根据需要填写 Base URL 和模型名称
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">3. 开始使用</h4>
              <p className="text-gray-600">
                配置完成后即可使用查词和文章生成功能
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 关于应用 */}
        <Card>
          <CardHeader>
            <CardTitle>关于 EasyWords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>版本：MVP v1.0</p>
            <p>更新日期：2026-03-15</p>
            <p className="text-gray-600">
              EasyWords 是一个语境化单词学习工具，帮助您通过在真实语境中阅读来复习单词。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
