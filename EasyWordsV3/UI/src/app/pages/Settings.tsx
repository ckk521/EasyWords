import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { api, ApiConfig, SettingsStatus } from '../services/api';
import { Key, Loader2, CheckCircle, XCircle, User, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  // 系统设置状态
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [settings, setSettings] = useState<SettingsStatus | null>(null);

  // 用户 API 配置状态
  const [userApiStatus, setUserApiStatus] = useState<{
    canUseOwnApi: boolean;
    hasOwnConfig: boolean;
    ownBaseURL: string | null;
    ownModel: string | null;
  } | null>(null);
  const [userApiKey, setUserApiKey] = useState('');
  const [userBaseURL, setUserBaseURL] = useState('');
  const [userModel, setUserModel] = useState('');

  // 加载状态
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userVerifying, setUserVerifying] = useState(false);
  const [userVerified, setUserVerified] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // 加载系统设置
      const settingsData = await api.getSettings();
      setSettings(settingsData);

      // 如果有保存的配置，预填充
      if (settingsData.baseURL) setBaseURL(settingsData.baseURL);
      if (settingsData.model) setModel(settingsData.model);

      // 尝试加载用户 API 状态（可能失败，因为用户没有权限或未登录）
      try {
        const userApiData = await api.getUserApiStatus();
        setUserApiStatus(userApiData);

        // 预填充用户配置
        if (userApiData.ownBaseURL) setUserBaseURL(userApiData.ownBaseURL);
        if (userApiData.ownModel) setUserModel(userApiData.ownModel);
      } catch {
        // 用户没有权限或 API 不可用，设置为默认状态
        setUserApiStatus({
          canUseOwnApi: false,
          hasOwnConfig: false,
          ownBaseURL: null,
          ownModel: null,
        });
      }
    } catch (error) {
      toast.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 系统设置相关
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

  // 用户 API 配置相关
  const handleUserVerify = async () => {
    if (!userApiKey.trim()) {
      toast.error('请输入 API Key');
      return;
    }

    setUserVerifying(true);
    try {
      const config: ApiConfig = {
        apiKey: userApiKey.trim(),
        baseURL: userBaseURL.trim() || undefined,
        model: userModel.trim() || undefined,
      };
      const isValid = await api.verifyUserApiConfig(config);
      if (isValid) {
        toast.success('API 配置验证成功');
        setUserVerified(true);
      } else {
        toast.error('API 配置无效');
        setUserVerified(false);
      }
    } catch (error) {
      toast.error('验证失败');
      setUserVerified(false);
    } finally {
      setUserVerifying(false);
    }
  };

  const handleUserSave = async () => {
    if (!userApiKey.trim()) {
      toast.error('请输入 API Key');
      return;
    }

    if (!userVerified) {
      toast.error('请先验证 API 配置');
      return;
    }

    setUserSaving(true);
    try {
      const config: ApiConfig = {
        apiKey: userApiKey.trim(),
        baseURL: userBaseURL.trim() || undefined,
        model: userModel.trim() || undefined,
      };
      await api.saveUserApiConfig(config);
      setUserApiStatus({
        ...userApiStatus!,
        hasOwnConfig: true,
        ownBaseURL: userBaseURL.trim() || null,
        ownModel: userModel.trim() || null,
      });
      setUserApiKey('');
      setUserVerified(false);
      toast.success('配置保存成功');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setUserSaving(false);
    }
  };

  const handleUserDelete = async () => {
    try {
      await api.deleteUserApiConfig();
      setUserApiStatus({
        ...userApiStatus!,
        hasOwnConfig: false,
        ownBaseURL: null,
        ownModel: null,
      });
      setUserBaseURL('');
      setUserModel('');
      setUserVerified(false);
      toast.success('配置已删除');
    } catch (error) {
      toast.error('删除失败');
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
        {/* 用户自定义 API 配置 */}
        {userApiStatus?.canUseOwnApi && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                我的 API 配置
              </CardTitle>
              <CardDescription>
                配置您自己的大模型 API，费用由您自己承担
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 状态显示 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">状态：</span>
                {userApiStatus.hasOwnConfig ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="size-3" />
                    已配置（使用您的 API）
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <XCircle className="size-3" />
                    未配置（使用系统默认）
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
                  value={userApiKey}
                  onChange={(e) => {
                    setUserApiKey(e.target.value);
                    setUserVerified(false);
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  支持任意兼容OpenAI接口的API KEY
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
                  value={userBaseURL}
                  onChange={(e) => {
                    setUserBaseURL(e.target.value);
                    setUserVerified(false);
                  }}
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
                  placeholder="例如: gpt-4, glm-4-flash, deepseek-chat"
                  value={userModel}
                  onChange={(e) => {
                    setUserModel(e.target.value);
                    setUserVerified(false);
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  请输入正确的模型名称，比如: 'glm-4-flash'
                </p>
              </div>

              {/* 当前配置显示 */}
              {userApiStatus.hasOwnConfig && (userApiStatus.ownBaseURL || userApiStatus.ownModel) && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">当前配置：</p>
                  {userApiStatus.ownBaseURL && (
                    <p className="text-xs text-gray-600">Base URL: {userApiStatus.ownBaseURL}</p>
                  )}
                  {userApiStatus.ownModel && (
                    <p className="text-xs text-gray-600">模型: {userApiStatus.ownModel}</p>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  onClick={handleUserSave}
                  disabled={userSaving || !userApiKey.trim() || !userVerified}
                >
                  {userSaving ? (
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
                  onClick={handleUserVerify}
                  disabled={userVerifying || !userApiKey.trim()}
                >
                  {userVerifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      验证中...
                    </>
                  ) : (
                    '验证'
                  )}
                </Button>

                {userApiStatus.hasOwnConfig && (
                  <Button
                    variant="destructive"
                    onClick={handleUserDelete}
                  >
                    删除配置
                  </Button>
                )}
              </div>

              {/* 提示信息 */}
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p className="font-medium mb-1">提示：</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>配置您自己的 API 后，系统将使用您的 API 进行查词、生成文章等操作</li>
                  <li>费用由您自己承担，请确保您的 API 有足够的额度</li>
                  <li>如果您的 API 出现问题，系统会提示您检查配置</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 系统默认 API 配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="size-5" />
              系统默认 API 配置
            </CardTitle>
            <CardDescription>
              {userApiStatus?.hasOwnConfig
                ? '您已配置自己的 API，以下系统配置不会生效'
                : '配置系统默认 API 以使用查词和文章生成功能'}
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
            {userApiStatus?.canUseOwnApi ? (
              <>
                <div>
                  <h4 className="font-medium mb-1">1. 配置您的 API</h4>
                  <p className="text-gray-600">
                    在"我的 API 配置"区域填写您的 API Key、Base URL 和模型名称
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">2. 验证配置</h4>
                  <p className="text-gray-600">
                    点击"验证"按钮，确保您的 API 配置正确可用
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">3. 保存并使用</h4>
                  <p className="text-gray-600">
                    验证成功后，点击"保存"按钮保存配置，系统将使用您的 API 进行所有操作
                  </p>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
