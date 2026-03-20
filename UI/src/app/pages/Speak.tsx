import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { speakApi } from '../services/speakApi';
import { SpeakScenario } from '../types/speak';
import { Loader2, Mic, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

// 难度选项
const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: '初级', description: '基础词汇，简单句式', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'intermediate', label: '中级', description: '日常对话，复合句', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'advanced', label: '高级', description: '俚语、地道表达', color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

export function Speak() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<SpeakScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('intermediate');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const data = await speakApi.getScenarios();
      setScenarios(data);
    } catch (error) {
      toast.error('加载场景失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async () => {
    if (!selectedScenario) {
      toast.error('请选择一个对话场景');
      return;
    }

    setCreating(true);
    try {
      const conversation = await speakApi.createConversation({
        scenarioId: selectedScenario,
        difficulty: selectedDifficulty as any,
        mode: 'press-to-talk', // 默认模式，可在对话页面切换
      });

      // 跳转到对话页面
      navigate(`/speak/conversation?id=${conversation.id}`);
    } catch (error) {
      toast.error('创建对话失败');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="size-10 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">AI 口语陪练</h1>
        <p className="text-gray-600">选择一个场景，开始你的英语口语练习</p>
      </div>

      {/* 场景选择 */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Mic className="size-5 text-blue-600" />
          选择对话场景
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`p-4 bg-white border-2 rounded-xl cursor-pointer transition-all ${
                selectedScenario === scenario.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => setSelectedScenario(scenario.id)}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{scenario.icon}</span>
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{scenario.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {scenario.learningGoals.slice(0, 3).map((goal, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 难度选择 */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <BookOpen className="size-5 text-blue-600" />
          选择难度
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DIFFICULTY_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                selectedDifficulty === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedDifficulty(option.value)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`px-2 py-0.5 rounded text-sm font-medium ${option.color}`}>
                    {option.label}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 ${
                    selectedDifficulty === option.value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedDifficulty === option.value && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 开始按钮 */}
      <div className="flex justify-center gap-4">
        <Button
          size="lg"
          className="w-48 py-6 text-lg"
          disabled={!selectedScenario || creating}
          onClick={handleStartConversation}
        >
          {creating ? (
            <>
              <Loader2 className="size-5 animate-spin mr-2" />
              创建中...
            </>
          ) : (
            '开始练习'
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-48 py-6 text-lg"
          onClick={() => navigate('/speak/history')}
        >
          查看练习记录
        </Button>
      </div>

      {/* 提示信息 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">💡 练习提示</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 找一个安静的环境，确保麦克风工作正常</li>
          <li>• 尽量使用完整的句子表达</li>
          <li>• 对话结束后会生成学习反馈报告</li>
          <li>• AI 会在对话中带入生词</li>
        </ul>
      </div>
    </div>
  );
}
