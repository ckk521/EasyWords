import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { speakApi } from '../services/speakApi';
import { SpeakConversation } from '../types/speak';
import { Loader2, Clock, MessageSquare, Mic, ChevronRight, Trash2, ChevronLeft, ChevronsLeft, ChevronsRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

export function SpeakHistory() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<SpeakConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadConversations();
  }, [page]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const result = await speakApi.getConversations(page, PAGE_SIZE);
      setConversations(result.conversations);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
      setTotalDuration(result.stats.totalDuration);
      setTotalFeedback(result.stats.totalFeedback);
    } catch (error) {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await speakApi.deleteConversation(id);
      // 如果当前页删除后没有数据了，回到上一页
      if (conversations.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadConversations();
      }
      setTotal(prev => prev - 1);
      toast.success('已删除');
    } catch (error) {
      toast.error('删除失败');
    }
    setDeleteConfirm(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      beginner: '初级',
      intermediate: '中级',
      advanced: '高级',
    };
    return labels[difficulty] || difficulty;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-100 text-green-700',
      intermediate: 'bg-blue-100 text-blue-700',
      advanced: 'bg-purple-100 text-purple-700',
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-700';
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
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">口语练习记录</h1>
        <p className="text-gray-600">查看你的口语练习历史和反馈</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-3xl font-semibold text-blue-600">{total}</p>
          <p className="text-sm text-gray-600">总对话数</p>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-3xl font-semibold text-blue-600">{totalDuration}</p>
          <p className="text-sm text-gray-600">总练习秒数</p>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-3xl font-semibold text-blue-600">{totalFeedback}</p>
          <p className="text-sm text-gray-600">已生成反馈</p>
        </div>
      </div>

      {/* 对话列表 */}
      {conversations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Mic className="size-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">还没有练习记录</p>
          <Button onClick={() => navigate('/speak')}>开始练习</Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/speak/conversation?id=${conversation.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="size-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{conversation.scenarioName}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(
                            conversation.difficulty
                          )}`}
                        >
                          {getDifficultyLabel(conversation.difficulty)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="size-4" />
                          {formatDate(conversation.startedAt)}
                        </span>
                        <span>{formatDuration(conversation.duration)}</span>
                        <span>{conversation.messages.length} 轮对话</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conversation.feedback ? (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">已生成反馈</span>
                    ) : (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">未完成</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ id: conversation.id, name: conversation.scenarioName });
                      }}
                    >
                      <Trash2 className="size-4 text-gray-400" />
                    </Button>
                    <ChevronRight className="size-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-4 text-sm text-gray-600">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          )}

          {/* 开始新练习 */}
          <div className="mt-8 text-center">
            <Button onClick={() => navigate('/speak')}>开始新练习</Button>
          </div>
        </>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">确认删除</h3>
                <p className="text-sm text-gray-500">此操作无法撤销</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              确定要删除「<span className="font-medium">{deleteConfirm.name}</span>」的练习记录吗？
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
