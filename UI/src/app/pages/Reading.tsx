import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { api } from '../services/api';
import { Article } from '../types/article';
import { Word } from '../types/word';
import { ArrowLeft, CheckCircle, Loader2, Languages, X } from 'lucide-react';
import { toast } from 'sonner';

// 词典查询结果类型
interface DictResult {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition?: string;
  loading?: boolean;
}

export function Reading() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('id');

  const [article, setArticle] = useState<Article & { words: Word[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  // 双击查词相关状态
  const [popupWord, setPopupWord] = useState<DictResult | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const wordCache = useRef<Record<string, DictResult>>({});
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (articleId) {
      loadArticle(articleId);
    }
  }, [articleId]);

  // 点击其他地方关闭弹窗
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupWord(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadArticle = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getArticle(id);
      setArticle(data);
      setTranslations(data.translations || {});
    } catch (error) {
      toast.error('加载文章失败');
      navigate('/vocabulary');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!article) return;

    setMarking(true);
    try {
      await api.markAsReviewed(article.wordIds);
      setMarked(true);
      toast.success('已标记为已复习');
    } catch (error) {
      toast.error('标记失败');
    } finally {
      setMarking(false);
    }
  };

  const handleTranslate = async (index: number, paragraph: string) => {
    if (!article) return;

    setTranslatingIndex(index);
    try {
      const result = await api.translateParagraph(article.id, index, paragraph);
      setTranslations(result.translations);
    } catch (error) {
      toast.error('翻译失败');
    } finally {
      setTranslatingIndex(null);
    }
  };

  // 双击查词
  const handleDoubleClick = async (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim().toLowerCase();

    if (!text || !/^[a-zA-Z\-']+$/.test(text)) return;

    // 获取点击位置
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopupPosition({
      x: e.clientX,
      y: e.clientY + 10,
    });

    // 检查缓存
    if (wordCache.current[text]) {
      setPopupWord(wordCache.current[text]);
      return;
    }

    // 显示加载状态
    setPopupWord({ word: text, loading: true });

    try {
      // 调用免费词典 API
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${text}`);
      if (response.ok) {
        const data = await response.json();
        const entry = data[0];

        if (entry) {
          // 提取音标
          let phonetic = '';
          if (entry.phonetics) {
            for (const p of entry.phonetics) {
              if (p.text) {
                phonetic = p.text;
                break;
              }
            }
          }

          // 提取释义
          let definition = '';
          let partOfSpeech = '';
          if (entry.meanings && entry.meanings.length > 0) {
            partOfSpeech = entry.meanings[0].partOfSpeech || '';
            if (entry.meanings[0].definitions && entry.meanings[0].definitions.length > 0) {
              definition = entry.meanings[0].definitions[0].definition;
            }
          }

          const result: DictResult = {
            word: text,
            phonetic,
            partOfSpeech,
            definition,
          };

          wordCache.current[text] = result;
          setPopupWord(result);
        } else {
          setPopupWord({ word: text, definition: '未找到释义' });
        }
      } else {
        setPopupWord({ word: text, definition: '未找到释义' });
      }
    } catch (error) {
      setPopupWord({ word: text, definition: '查询失败' });
    }
  };

  // 长按查词（移动端）
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];

    longPressTimer.current = setTimeout(async () => {
      // 获取触摸位置的元素
      const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
      if (!element) return;

      // 尝试获取精确的单词位置
      let word = '';

      // 方法1: 使用 caretRangeFromPoint (Chrome/Safari) 或 caretPositionFromPoint (Firefox)
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(touch.clientX, touch.clientY);
        if (range) {
          const textNode = range.startContainer;
          if (textNode.nodeType === Node.TEXT_NODE) {
            const text = textNode.textContent || '';
            const offset = range.startOffset;

            let start = offset;
            while (start > 0 && /[a-zA-Z]/.test(text[start - 1])) start--;
            let end = offset;
            while (end < text.length && /[a-zA-Z]/.test(text[end])) end++;

            if (end > start) word = text.substring(start, end).toLowerCase();
          }
        }
      } else if ((document as any).caretPositionFromPoint) {
        // Firefox
        const pos = (document as any).caretPositionFromPoint(touch.clientX, touch.clientY);
        if (pos && pos.offsetNode && pos.offsetNode.nodeType === Node.TEXT_NODE) {
          const text = pos.offsetNode.textContent || '';
          const offset = pos.offset;

          let start = offset;
          while (start > 0 && /[a-zA-Z]/.test(text[start - 1])) start--;
          let end = offset;
          while (end < text.length && /[a-zA-Z]/.test(text[end])) end++;

          if (end > start) word = text.substring(start, end).toLowerCase();
        }
      }

      // 方法2: 从选中的文本获取
      if (!word || word.length < 2) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          const selectedText = selection.toString().trim().toLowerCase();
          if (/^[a-zA-Z\-']+$/.test(selectedText)) {
            word = selectedText;
          }
        }
      }

      if (!word || word.length < 2) return;

      setPopupPosition({ x: touch.clientX, y: touch.clientY + 10 });

      // 检查缓存
      if (wordCache.current[word]) {
        setPopupWord({ ...wordCache.current[word] });
        return;
      }

      // 显示加载状态
      setPopupWord({ word, loading: true });

      try {
        const result = await api.quickLookup(word);
        const dictResult: DictResult = {
          word,
          phonetic: result.phoneticUs,
          definition: result.chineseDefinition,
        };
        wordCache.current[word] = dictResult;
        setPopupWord({ ...dictResult });
      } catch (error) {
        setPopupWord({ word, definition: '查询失败' });
      }
    }, 800); // 800ms 长按触发
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 将文章按段落分割
  const splitParagraphs = (content: string): string[] => {
    // 按换行符分割，过滤空段落
    return content.split(/\n\s*\n/).filter(p => p.trim());
  };

  // 渲染带高亮的段落内容
  const renderParagraph = (text: string) => {
    // 创建生词集合（小写，用于匹配）
    const wordSet = new Set(article?.words.map(w => w.word.toLowerCase()) || []);

    // 将 **word** 格式转换为高亮显示（只高亮真正的生词）
    const parts = text.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const word = part.slice(2, -2);
        // 只有在生词列表中的才高亮显示
        if (wordSet.has(word.toLowerCase())) {
          return (
            <strong key={index} className="font-bold text-blue-600 bg-blue-50 px-1 rounded">
              {word}
            </strong>
          );
        }
        // 不在生词列表中的，移除星号但不高亮
        return <span key={index}>{word}</span>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12 text-gray-500">
          <p>文章不存在</p>
          <Button onClick={() => navigate('/vocabulary')} className="mt-4">
            返回生词本
          </Button>
        </div>
      </div>
    );
  }

  const paragraphs = splitParagraphs(article.content);
  const typeLabels = {
    news: '新闻',
    story: '故事'
  };

  const lengthLabels = {
    short: '短篇',
    medium: '中篇',
    long: '长篇'
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 顶部导航 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/vocabulary')}
          className="mb-4"
        >
          <ArrowLeft className="size-4 mr-2" />
          返回生词本
        </Button>

        <div className="flex items-center gap-2 mb-2">
          <Badge>{typeLabels[article.type]}</Badge>
          <Badge variant="outline">{lengthLabels[article.length]}</Badge>
          <Badge variant="outline">{article.words.length} 个生词</Badge>
        </div>

        {/* 生词列表 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {article.words.map((word) => (
            <span
              key={word.id}
              className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full"
            >
              {word.word}
            </span>
          ))}
        </div>
      </div>

      {/* 文章内容 */}
      <div className="bg-white border rounded-lg p-8 mb-6">
        {/* 文章标题 */}
        {article.title && (
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{article.title}</h1>
        )}

        <div
          className="prose prose-lg max-w-none space-y-6 select-text cursor-text"
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
        >
          {paragraphs.map((paragraph, index) => (
            <div key={index} className="group">
              {/* 段落内容 */}
              <div className="text-gray-800 leading-relaxed">
                {renderParagraph(paragraph)}
              </div>

              {/* 翻译按钮 */}
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-blue-600 h-7 px-2"
                  onClick={() => handleTranslate(index, paragraph)}
                  disabled={translatingIndex === index}
                >
                  {translatingIndex === index ? (
                    <>
                      <Loader2 className="size-3 animate-spin mr-1" />
                      翻译中...
                    </>
                  ) : translations[index] ? (
                    <>
                      <Languages className="size-3 mr-1" />
                      重新翻译
                    </>
                  ) : (
                    <>
                      <Languages className="size-3 mr-1" />
                      翻译
                    </>
                  )}
                </Button>
              </div>

              {/* 翻译结果 */}
              {translations[index] && (
                <div className="mt-3 pl-4 border-l-2 border-green-200 bg-green-50 p-3 rounded-r-md">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {translations[index]}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 双击/长按查词弹窗 */}
      {popupWord && (
        <div
          ref={popupRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[200px] max-w-[300px]"
          style={{
            left: Math.min(Math.max(popupPosition.x - 100, 10), window.innerWidth - 320),
            top: Math.min(popupPosition.y, window.innerHeight - 180),
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="font-bold text-lg text-gray-900">{popupWord.word}</span>
              {popupWord.phonetic && (
                <span className="text-sm text-gray-500 ml-2">{popupWord.phonetic}</span>
              )}
            </div>
            <button
              onClick={() => setPopupWord(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="size-4" />
            </button>
          </div>

          {popupWord.loading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="size-4 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {popupWord.partOfSpeech && (
                <span className="text-xs text-gray-500 italic mb-1 block">
                  {popupWord.partOfSpeech}
                </span>
              )}
              {popupWord.definition && (
                <p className="text-sm text-gray-700">{popupWord.definition}</p>
              )}
            </>
          )}

          <p className="text-xs text-gray-400 mt-2 pt-2 border-t">
            双击/长按其他单词继续查询
          </p>
        </div>
      )}

      {/* 底部操作 */}
      <div className="sticky bottom-0 bg-white border-t shadow-lg p-4 rounded-t-lg">
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleMarkReviewed}
            disabled={marking || marked}
          >
            {marking ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                标记中...
              </>
            ) : marked ? (
              <>
                <CheckCircle className="size-4 mr-2" />
                已标记为已复习
              </>
            ) : (
              <>
                <CheckCircle className="size-4 mr-2" />
                标记已复习
              </>
            )}
          </Button>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">
          双击单词可快速查词 | 标记后将更新单词的复习时间
        </p>
      </div>
    </div>
  );
}
