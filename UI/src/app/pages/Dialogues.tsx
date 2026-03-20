import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { api } from '../services/api';
import { Loader2, Trash2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

interface DialogueItem {
  id: string;
  scene: string;
  topic?: string;
  words: string[];
  wordIds: string[];
  dialogue: Array<{
    speaker: string;
    text: string;
  }>;
  createdAt: string;
}

export function Dialogues() {
  const navigate = useNavigate();
  const [dialogues, setDialogues] = useState<DialogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadDialogues();
  }, [page]);

  const loadDialogues = async () => {
    setLoading(true);
    try {
      const result = await api.getDialogues(page, 10);
      setDialogues(result.dialogues);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDialogue(id);
      setDialogues(dialogues.filter(d => d.id !== id));
      toast.success('已删除');
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handlePlay = (dialogue: DialogueItem) => {
    navigate(`/dialogue?id=${dialogue.id}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hour}:${minute}`;
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
      <h1 className="text-3xl font-semibold mb-6">
        生词会话
        <span className="text-lg font-normal text-gray-500 ml-3">
          共 {dialogues.length} 条
        </span>
      </h1>

      {dialogues.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>暂无会话记录</p>
          <p className="text-sm mt-2">在生词本选择单词生成对话</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dialogues.map((dialogue) => (
            <div
              key={dialogue.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{formatDate(dialogue.createdAt)}</p>
                  {dialogue.topic && (
                    <p className="text-blue-600 text-sm font-medium">主题：{dialogue.topic}</p>
                  )}
                  <p className="text-gray-800">{dialogue.scene}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlay(dialogue)}
                  >
                    <Volume2 className="size-4 mr-1" />
                    播放
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(dialogue.id)}
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                </div>
              </div>

              {/* 单词标签 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {dialogue.words.map((word, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {word}
                  </span>
                ))}
              </div>

              {/* 对话预览 */}
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
                {dialogue.dialogue.slice(0, 2).map((line, index) => (
                  <p key={index} className="mb-1">
                    <span className={`font-medium ${line.speaker === 'A' ? 'text-blue-600' : 'text-pink-600'}`}>
                      {line.speaker}:
                    </span>{' '}
                    {line.text.replace(/\*\*/g, '')}
                  </p>
                ))}
                {dialogue.dialogue.length > 2 && (
                  <p className="text-gray-400">... 共 {dialogue.dialogue.length} 轮对话</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <span className="py-2 px-4 text-gray-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
