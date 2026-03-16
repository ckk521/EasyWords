import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { api } from '../services/api';
import { Word } from '../types/word';
import { Search, Sparkles, Loader2, Trash2, Eye, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { WordCard } from '../components/word/WordCard';

export function Vocabulary() {
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [articleType, setArticleType] = useState<'news' | 'story'>('story');
  const [articleLength, setArticleLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [articleTopic, setArticleTopic] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [viewWord, setViewWord] = useState<Word | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [dialogueTopic, setDialogueTopic] = useState('');
  const [dialogueAccent, setDialogueAccent] = useState('en-US');
  const contentRef = useRef('');

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    setLoading(true);
    try {
      const { words: data } = await api.getWords({ search });
      setWords(data);
    } catch (error) {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWords();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleRecommend = async (count: number) => {
    try {
      const recommended = await api.recommendWords(count);
      const recommendedIds = new Set(recommended.map(w => w.id));
      setSelectedIds(recommendedIds);
      toast.success(`已推荐 ${recommended.length} 个单词`);
    } catch (error) {
      toast.error('推荐失败');
    }
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.error('请至少选择一个单词');
      return;
    }

    setGenerating(true);
    setStreamingContent('');
    contentRef.current = '';
    setShowPreview(true);

    try {
      await api.generateArticleStream(
        {
          wordIds: Array.from(selectedIds),
          type: articleType,
          length: articleLength,
          topic: articleTopic.trim() || undefined
        },
        {
          onInfo: (data) => {
            console.log('开始生成文章:', data);
          },
          onChunk: (content) => {
            contentRef.current += content;
            setStreamingContent(contentRef.current);
          },
          onSaved: async (data) => {
            // 标记为已复习
            await api.markAsReviewed(Array.from(selectedIds));

            toast.success('文章生成成功');
            setGenerating(false);
            setShowPreview(false);
            navigate(`/reading?id=${data.id}`);
          },
          onError: (error) => {
            toast.error(error || '生成失败');
            setGenerating(false);
            setShowPreview(false);
          },
        }
      );
    } catch (error) {
      toast.error('生成失败');
      setGenerating(false);
      setShowPreview(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (selectedIds.size === 0) {
      toast.error('请至少选择一个单词');
      return;
    }
    if (selectedIds.size > 3) {
      toast.error('生成对话音频最多选择 3 个单词');
      return;
    }

    // 跳转到对话音频页面
    const topicParam = dialogueTopic.trim() ? `&topic=${encodeURIComponent(dialogueTopic.trim())}` : '';
    navigate(`/dialogue?wordIds=${Array.from(selectedIds).join(',')}${topicParam}&accent=${dialogueAccent}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteWord(id);
      setWords(words.filter(w => w.id !== id));
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
      toast.success('已删除');
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();

    // 重置到当天0点进行比较
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.floor((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';

    // 其他情况显示具体日期
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    // 如果是今年，只显示月日；否则显示年月日
    if (year === now.getFullYear()) {
      return `${month}月${day}日`;
    }
    return `${year}年${month}月${day}日`;
  };

  const getDaysNotReviewed = (word: Word) => {
    if (!word.lastReviewedAt) return '从未复习';
    const date = new Date(word.lastReviewedAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '今天复习';
    return `${days}天未复习`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 标题和操作栏 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-semibold">
            生词本 
            <span className="text-lg font-normal text-gray-500 ml-3">
              共 {words.length} 词
            </span>
          </h1>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索单词..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* 单词列表 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>生词本是空的</p>
          <p className="text-sm mt-2">在查词页面添加单词</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {words.map((word) => (
            <div
              key={word.id}
              className={`flex items-center gap-4 p-4 bg-white border rounded-lg transition-colors cursor-pointer ${
                selectedIds.has(word.id) ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleToggle(word.id)}
            >
              <Checkbox
                checked={selectedIds.has(word.id)}
                onCheckedChange={() => handleToggle(word.id)}
                onClick={(e) => e.stopPropagation()}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-lg">{word.word}</h3>
                  <span className="text-sm text-gray-500">{word.phoneticUs}</span>
                </div>
                <p className="text-sm text-gray-600 truncate">{word.chineseDefinition}</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{getTimeAgo(word.createdAt)}</span>
                {word.lastReviewedAt && (
                  <Badge variant="outline" className="whitespace-nowrap">
                    ⏰ {getDaysNotReviewed(word)}
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewWord(word);
                }}
              >
                <Eye className="size-4 text-gray-600" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleDelete(word.id, e)}
              >
                <Trash2 className="size-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 生成控制栏 */}
      {words.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t shadow-lg p-4 rounded-t-lg">
          {/* 已选词数 */}
          <p className="text-sm text-gray-600 mb-3">
            已选 <span className="font-semibold text-blue-600">{selectedIds.size}</span> 词
          </p>

          {/* 两个生成入口 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 生成文章 */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                ✨ 生成文章
              </h3>
              <div className="flex gap-3 items-end mb-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-600 mb-1 block">主题（可选）</label>
                  <Input
                    placeholder="如：环境保护、科技发展..."
                    value={articleTopic}
                    onChange={(e) => setArticleTopic(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">类型</label>
                  <Select value={articleType} onValueChange={(v: any) => setArticleType(v)}>
                    <SelectTrigger className="w-[100px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="news">新闻</SelectItem>
                      <SelectItem value="story">故事</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">长度</label>
                  <Select value={articleLength} onValueChange={(v: any) => setArticleLength(v)}>
                    <SelectTrigger className="w-[110px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">短篇 (~200词)</SelectItem>
                      <SelectItem value="medium">中篇 (~500词)</SelectItem>
                      <SelectItem value="long">长篇 (~800词)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleRecommend(10)}
                >
                  <Sparkles className="size-4 mr-2" />
                  推荐 10 词
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleGenerate}
                  disabled={selectedIds.size === 0 || generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      生成中...
                    </>
                  ) : (
                    '生成文章'
                  )}
                </Button>
              </div>
            </div>

            {/* 生成对话音频 */}
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Headphones className="size-5 text-blue-600" />
                生成对话音频
                <span className="text-xs text-gray-500 font-normal">（最多 3 词）</span>
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                选择 1-3 个单词，AI 生成一段对话，通过听力加深记忆
              </p>
              <div className="mb-3">
                <label className="text-xs text-gray-600 mb-1 block">主题（可选，最多10字）</label>
                <Input
                  placeholder="如：职场面试、旅行计划..."
                  value={dialogueTopic}
                  onChange={(e) => setDialogueTopic(e.target.value.slice(0, 10))}
                  className="h-9"
                  maxLength={10}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{dialogueTopic.length}/10</p>
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-600 mb-1 block">口音</label>
                <Select value={dialogueAccent} onValueChange={setDialogueAccent}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">🇺🇸 美式英语</SelectItem>
                    <SelectItem value="en-GB">🇬🇧 英式英语</SelectItem>
                    <SelectItem value="en-IN">🇮🇳 印度英语</SelectItem>
                    <SelectItem value="en-AU">🇦🇺 澳洲英语</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleRecommend(3)}
                >
                  <Sparkles className="size-4 mr-2" />
                  推荐 3 词
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleGenerateAudio}
                  disabled={selectedIds.size === 0 || selectedIds.size > 3 || generatingAudio}
                >
                  {generatingAudio ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Headphones className="size-4 mr-2" />
                      生成对话音频
                    </>
                  )}
                </Button>
              </div>
              {selectedIds.size > 3 && (
                <p className="text-xs text-red-500 mt-2 text-center">
                  当前已选 {selectedIds.size} 词，超出限制
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 文章生成预览对话框 */}
      <Dialog open={showPreview} onOpenChange={() => {
        if (!generating) setShowPreview(false);
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {generating && <Loader2 className="size-4 animate-spin" />}
              {generating ? 'AI 正在生成内容...' : '生成完成'}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-lg max-w-none">
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[200px]">
              {renderPreviewContent(streamingContent)}
            </div>
          </div>
          {generating && (
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">正在创作中，请稍候...</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 单词详情对话框 */}
      <Dialog open={!!viewWord} onOpenChange={() => setViewWord(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewWord && <WordCard word={viewWord} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 渲染带高亮的预览内容
function renderPreviewContent(content: string) {
  if (!content) return <span className="text-gray-400">等待 AI 开始创作...</span>;

  // 将 **word** 格式转换为高亮显示
  const parts = content.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const word = part.slice(2, -2);
      return (
        <strong key={index} className="font-bold text-blue-600 bg-blue-50 px-1 rounded">
          {word}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
