import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { api } from '../services/api';
import { Loader2, Play, Pause, RotateCcw, ArrowLeft, X, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

interface DialogueLine {
  speaker: string;
  text: string;
}

interface DialogueData {
  id: string;
  wordIds: string[];
  words: string[];
  scene: string;
  topic?: string;
  dialogue: DialogueLine[];
  duration?: number;
  createdAt: string;
}

// 口音选项
const ACCENT_OPTIONS = [
  { value: 'en-US', label: '美式英语', flag: '🇺🇸' },
  { value: 'en-GB', label: '英式英语', flag: '🇬🇧' },
  { value: 'en-IN', label: '印度英语', flag: '🇮🇳' },
  { value: 'en-AU', label: '澳洲英语', flag: '🇦🇺' },
];

export function Dialogue() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dialogueId = searchParams.get('id');
  const wordIds = searchParams.get('wordIds')?.split(',') || [];
  const topicParam = searchParams.get('topic');
  const accentParam = searchParams.get('accent') || 'en-US';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DialogueData | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [accent, setAccent] = useState(accentParam);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // 音频播放
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Map<string, string>>(new Map());
  const playingRef = useRef(false);
  const preloadingRef = useRef<Promise<string | null> | null>(null); // 预加载的音频 Promise

  // 长按查词
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<{ chinese: string; phonetic: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (dialogueId) {
      loadDialogue();
    } else if (wordIds.length > 0) {
      generateDialogue();
    } else {
      toast.error('参数错误');
      navigate('/vocabulary');
    }

    return () => stopPlayback();
  }, []);

  // 页面加载完成后预加载前两句音频
  useEffect(() => {
    if (data && data.dialogue.length > 0) {
      // 预加载第一句
      getAudioUrl(0).catch(() => {});
      // 预加载第二句（如果有）
      if (data.dialogue.length > 1) {
        getAudioUrl(1).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, accent]);

  const loadDialogue = async () => {
    setLoading(true);
    try {
      const result = await api.getDialogue(dialogueId!);
      setData(result);
    } catch (error: any) {
      toast.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const generateDialogue = async () => {
    setLoading(true);
    setCurrentLineIndex(0);
    playingRef.current = false;

    try {
      const { words: allWords } = await api.getWords({});
      const selectedWords = allWords.filter(w => wordIds.includes(w.id));

      if (selectedWords.length === 0) {
        toast.error('未找到选中的单词');
        navigate('/vocabulary');
        return;
      }

      const result = await api.generateDialogue({
        words: selectedWords.map(w => w.word),
        wordIds: wordIds,
        topic: topicParam || undefined,
      });

      setData(result);
    } catch (error: any) {
      toast.error(error.message || '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const stopPlayback = () => {
    playingRef.current = false;
    preloadingRef.current = null; // 清除预加载
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  };

  // Base64 转 Blob
  const base64ToBlob = (base64: string, mime: string): Blob => {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  // 获取或生成音频
  const getAudioUrl = async (index: number): Promise<string | null> => {
    if (!data) return null;

    const line = data.dialogue[index];
    const key = `${index}-${accent}-${line.speaker}`;

    if (audioCache.current.has(key)) {
      return audioCache.current.get(key)!;
    }

    try {
      const cleanText = line.text.replace(/\*\*/g, '');
      const result = await api.synthesizeSpeech({
        text: cleanText,
        lang: accent,
        speaker: line.speaker as 'A' | 'B',
        speed: 0.9,
      });

      const blob = base64ToBlob(result.audio, 'audio/mpeg');
      const url = URL.createObjectURL(blob);
      audioCache.current.set(key, url);
      return url;
    } catch (error: any) {
      throw error;
    }
  };

  // 播放指定行
  const playLine = async (index: number) => {
    if (!data || index >= data.dialogue.length || !playingRef.current) {
      setLoadingAudio(false);
      stopPlayback();
      if (data && index >= data.dialogue.length) setCurrentLineIndex(0);
      return;
    }

    setCurrentLineIndex(index);

    try {
      // 检查缓存中是否已有当前句
      const currentKey = `${index}-${accent}-${data.dialogue[index].speaker}`;
      const hasCache = audioCache.current.has(currentKey);

      // 如果没有缓存，显示加载状态
      if (!hasCache) {
        setLoadingAudio(true);
      }

      // 获取当前句的音频（如果有缓存会直接返回）
      const url = await getAudioUrl(index);
      setLoadingAudio(false);

      if (!url || !playingRef.current) {
        stopPlayback();
        return;
      }

      // 检查缓存中是否已有下一句，没有则预加载
      if (index < data.dialogue.length - 1) {
        const nextKey = `${index + 1}-${accent}-${data.dialogue[index + 1].speaker}`;
        if (!audioCache.current.has(nextKey)) {
          // 后台预加载下一句，不阻塞当前播放
          getAudioUrl(index + 1).catch(() => {});
        }
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        if (playingRef.current && index < data.dialogue.length - 1) {
          playLine(index + 1);
        } else {
          setLoadingAudio(false);
          stopPlayback();
          if (index >= data.dialogue.length - 1) setCurrentLineIndex(0);
        }
      };

      audio.onerror = () => {
        setLoadingAudio(false);
        toast.error('音频播放失败');
        stopPlayback();
      };

      await audio.play();
    } catch (error: any) {
      setLoadingAudio(false);
      toast.error(error.message || '生成音频失败');
      stopPlayback();
    }
  };

  const togglePlay = async () => {
    if (!data) return;
    if (playing) {
      stopPlayback();
    } else {
      playingRef.current = true;
      setPlaying(true);
      playLine(currentLineIndex);
    }
  };

  const handleReplay = async () => {
    stopPlayback();
    setCurrentLineIndex(0);
    playingRef.current = true;
    setPlaying(true);
    playLine(0);
  };

  // 播放单行（点击喇叭icon）
  const playSingleLine = async (index: number) => {
    if (!data || loadingAudio) return;

    // 停止当前播放
    stopPlayback();

    playingRef.current = true;
    setPlaying(true);
    setCurrentLineIndex(index);

    // 检查缓存中是否已有
    const currentKey = `${index}-${accent}-${data.dialogue[index].speaker}`;
    const hasCache = audioCache.current.has(currentKey);

    if (!hasCache) {
      setLoadingAudio(true);
    }

    try {
      const url = await getAudioUrl(index);
      setLoadingAudio(false);

      if (!url) {
        stopPlayback();
        return;
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        stopPlayback();
      };

      audio.onerror = () => {
        setLoadingAudio(false);
        toast.error('音频播放失败');
        stopPlayback();
      };

      await audio.play();
    } catch (error: any) {
      setLoadingAudio(false);
      toast.error(error.message || '生成音频失败');
      stopPlayback();
    }
  };

  // 长按查词
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(async () => {
      const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
      if (!element) return;

      let word = '';
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(touch.clientX, touch.clientY);
        if (range?.startContainer?.nodeType === Node.TEXT_NODE) {
          const text = range.startContainer.textContent || '';
          const offset = range.startOffset;
          let start = offset, end = offset;
          while (start > 0 && /[a-zA-Z]/.test(text[start - 1])) start--;
          while (end < text.length && /[a-zA-Z]/.test(text[end])) end++;
          if (end > start) word = text.substring(start, end).toLowerCase();
        }
      }

      if (!word || word.length < 2) {
        const text = element.textContent || '';
        const words = text.match(/[a-zA-Z]{2,}/g);
        if (words?.length) word = words[0].toLowerCase();
      }

      if (word && word.length >= 2) {
        setPopupPosition({ x: touch.clientX, y: touch.clientY });
        setLookupWord(word);
        setLookupLoading(true);
        setLookupResult(null);
        try {
          const result = await api.quickLookup(word);
          setLookupResult({
            chinese: result.chineseDefinition || '未找到释义',
            phonetic: result.phoneticUs || '',
          });
        } catch {
          setLookupResult({ chinese: '查询失败', phonetic: '' });
        } finally {
          setLookupLoading(false);
        }
      }
    }, 800);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const closeLookupPopup = () => {
    setLookupWord(null);
    setLookupResult(null);
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    const text = window.getSelection()?.toString().trim().toLowerCase();
    if (!text || !/^[a-zA-Z\-']+$/.test(text)) return;

    setPopupPosition({ x: e.clientX, y: e.clientY + 10 });
    setLookupWord(text);
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const result = await api.quickLookup(text);
      setLookupResult({
        chinese: result.chineseDefinition || '未找到释义',
        phonetic: result.phoneticUs || '',
      });
    } catch {
      setLookupResult({ chinese: '查询失败', phonetic: '' });
    } finally {
      setLookupLoading(false);
    }
  };

  const renderHighlightedText = (text: string) => {
    // 创建生词集合（小写，用于匹配）
    const wordSet = new Set(data?.words.map(w => w.toLowerCase()) || []);

    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const word = part.slice(2, -2);
        // 只有在生词列表中的才高亮显示
        if (wordSet.has(word.toLowerCase())) {
          return (
            <span key={i} className="text-blue-600 font-semibold bg-blue-50 px-1 rounded">
              {word}
            </span>
          );
        }
        // 不在生词列表中的，移除星号但不高亮
        return <span key={i}>{word}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const getProgress = () => {
    if (!data) return 0;
    return ((currentLineIndex + 1) / data.dialogue.length) * 100;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="size-10 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">AI 正在生成对话...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center py-20">
          <p className="text-gray-600">生成失败，请重试</p>
          <Button className="mt-4" onClick={() => navigate('/vocabulary')}>返回生词本</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="ghost" className="mb-6" onClick={() => {
        stopPlayback();
        navigate(dialogueId ? '/dialogues' : '/vocabulary');
      }}>
        <ArrowLeft className="size-4 mr-2" />
        {dialogueId ? '返回会话记录' : '返回生词本'}
      </Button>

      <h1 className="text-2xl font-semibold mb-2">对话音频</h1>
      {data.topic && <p className="text-blue-600 font-medium mb-1">主题：{data.topic}</p>}
      <p className="text-gray-500 mb-6">场景：{data.scene}</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {data.words.map((word, i) => (
          <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{word}</span>
        ))}
      </div>

      <div
        className="bg-white border rounded-lg p-6 mb-6 space-y-4 select-text"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        {data.dialogue.map((line, i) => (
          <div key={i} className={`p-3 rounded-lg transition-colors ${i === currentLineIndex && playing ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
            <div className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${line.speaker === 'A' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'}`}>
                {line.speaker}
              </span>
              <div className="flex-1">
                <p className="text-gray-800 leading-relaxed">{renderHighlightedText(line.text)}</p>
              </div>
              <button
                onClick={() => playSingleLine(i)}
                className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                  i === currentLineIndex && playing
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title="播放此句"
              >
                <Volume2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="mb-4 text-sm text-gray-600">
          当前口音：<span className="font-medium text-gray-800">
            {ACCENT_OPTIONS.find(o => o.value === accent)?.flag} {ACCENT_OPTIONS.find(o => o.value === accent)?.label}
          </span>
        </div>

        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${getProgress()}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>第 {currentLineIndex + 1}/{data.dialogue.length} 句</span>
            <span>共 {data.dialogue.length} 轮对话</span>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="outline" size="lg" onClick={handleReplay} disabled={loadingAudio}>
            <RotateCcw className="size-5" />
          </Button>
          <Button size="lg" className="w-20" onClick={togglePlay} disabled={loadingAudio}>
            {loadingAudio ? <Loader2 className="size-5 animate-spin" /> : playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
        </div>

        {loadingAudio && (
          <p className="text-center text-sm text-blue-600 mt-2">
            <Volume2 className="size-4 inline mr-1 animate-pulse" />正在生成音频...
          </p>
        )}
      </div>

      {!dialogueId && (
        <div className="text-center mt-6">
          <Button variant="outline" onClick={() => { stopPlayback(); generateDialogue(); }}>重新生成</Button>
        </div>
      )}

      {lookupWord && (
        <div className="fixed inset-0 z-50" onClick={closeLookupPopup}>
          <div
            className="fixed bg-white rounded-lg shadow-xl border p-4 min-w-[200px] max-w-[280px]"
            style={{
              left: Math.min(Math.max(popupPosition.x - 100, 10), window.innerWidth - 290),
              top: Math.min(popupPosition.y + 20, window.innerHeight - 160),
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-semibold text-blue-600">{lookupWord}</span>
              <button onClick={closeLookupPopup} className="text-gray-400 hover:text-gray-600"><X className="size-4" /></button>
            </div>
            {lookupLoading ? (
              <div className="flex items-center justify-center py-3"><Loader2 className="size-5 animate-spin text-blue-600" /></div>
            ) : lookupResult && (
              <div>
                {lookupResult.phonetic && <p className="text-sm text-gray-500 mb-1">{lookupResult.phonetic}</p>}
                <p className="text-gray-800">{lookupResult.chinese}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2 pt-2 border-t">双击/长按单词可查看释义</p>
          </div>
        </div>
      )}
    </div>
  );
}
