import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { api } from '../services/api';
import { Loader2, Play, Pause, RotateCcw, ArrowLeft, X } from 'lucide-react';
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
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speakingRef = useRef(false);

  // 长按查词相关状态
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<{ chinese: string; phonetic: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (dialogueId) {
      // 加载已保存的对话
      loadDialogue();
    } else if (wordIds.length > 0) {
      // 生成新对话
      generateDialogue();
    } else {
      toast.error('参数错误');
      navigate('/vocabulary');
      return;
    }

    // 加载可用语音
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // 预热语音引擎（解决第一次播放开头没声音的问题）
    const warmup = new SpeechSynthesisUtterance('');
    warmup.volume = 0;
    window.speechSynthesis.speak(warmup);
    window.speechSynthesis.cancel();

    // 清理函数
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
    speakingRef.current = false;

    try {
      // 获取单词信息
      const { words: allWords } = await api.getWords({});
      const selectedWords = allWords.filter(w => wordIds.includes(w.id));

      if (selectedWords.length === 0) {
        toast.error('未找到选中的单词');
        navigate('/vocabulary');
        return;
      }

      // 调用对话生成 API
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

  // 获取语音配置
  const getVoiceForSpeaker = (speaker: string): SpeechSynthesisVoice | null => {
    // 先按口音筛选
    const accentVoices = availableVoices.filter(v => v.lang.startsWith(accent));

    if (accentVoices.length > 0) {
      // 根据说话人选择不同的声音
      if (speaker === 'A') {
        // 男声：优先选择带 male 关键词的
        const maleVoice = accentVoices.find(v =>
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('david') ||
          v.name.toLowerCase().includes('guy') ||
          v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('mark') ||
          v.name.toLowerCase().includes('james')
        );
        return maleVoice || accentVoices[0];
      } else {
        // 女声：优先选择带 female 关键词的
        const femaleVoice = accentVoices.find(v =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('jenny') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('susan') ||
          v.name.toLowerCase().includes('linda') ||
          v.name.toLowerCase().includes('hazel')
        );
        return femaleVoice || accentVoices[Math.min(1, accentVoices.length - 1)] || accentVoices[0];
      }
    }

    // 没有对应口音的语音，使用默认英语语音
    const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
    return englishVoices[0] || availableVoices[0];
  };

  // 预热语音引擎（解决开头没声音的问题）
  const warmupSpeechEngine = () => {
    const warmup = new SpeechSynthesisUtterance('');
    warmup.volume = 0;
    warmup.rate = 1;
    window.speechSynthesis.speak(warmup);
    window.speechSynthesis.cancel();
  };

  // 播放指定行的对话
  const speakLine = (index: number) => {
    if (!data || index >= data.dialogue.length) {
      setPlaying(false);
      speakingRef.current = false;
      return;
    }

    const line = data.dialogue[index];
    // 移除 ** 标记，避免语音读出星号
    const cleanText = line.text.replace(/\*\*/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // 设置语音
    const voice = getVoiceForSpeaker(line.speaker);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.lang = accent;
    utterance.rate = 0.9; // 稍慢一点，便于学习
    utterance.pitch = line.speaker === 'A' ? 0.9 : 1.1; // 男声低沉，女声高亢

    utterance.onend = () => {
      if (speakingRef.current && index < data.dialogue.length - 1) {
        setCurrentLineIndex(index + 1);
        setTimeout(() => speakLine(index + 1), 300);
      } else {
        setPlaying(false);
        speakingRef.current = false;
        if (index >= data.dialogue.length - 1) {
          setCurrentLineIndex(0);
        }
      }
    };

    utterance.onerror = () => {
      setPlaying(false);
      speakingRef.current = false;
    };

    setCurrentLineIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  // 切换播放/暂停
  const togglePlay = () => {
    if (!data) return;

    if (playing) {
      // 暂停
      window.speechSynthesis.cancel();
      setPlaying(false);
      speakingRef.current = false;
    } else {
      // 播放
      warmupSpeechEngine(); // 预热语音引擎
      speakingRef.current = true;
      setPlaying(true);
      setTimeout(() => speakLine(currentLineIndex), 150); // 稍微延迟让引擎准备好
    }
  };

  // 重新播放
  const handleReplay = () => {
    window.speechSynthesis.cancel();
    setCurrentLineIndex(0);
    speakingRef.current = true;
    setPlaying(true);
    warmupSpeechEngine(); // 预热语音引擎
    setTimeout(() => speakLine(0), 150);
  };

  // 长按查词 - 开始长按（移动端）
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

      // 方法2: 备选方案 - 从选中的文本获取
      if (!word || word.length < 2) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          const selectedText = selection.toString().trim().toLowerCase();
          if (/^[a-zA-Z\-']+$/.test(selectedText)) {
            word = selectedText;
          }
        }
      }

      // 方法3: 从点击的元素文本中提取
      if (!word || word.length < 2) {
        const text = element.textContent || '';
        const words = text.match(/[a-zA-Z]{2,}/g);
        if (words && words.length > 0) {
          // 取第一个单词
          word = words[0].toLowerCase();
        }
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
        } catch (error) {
          setLookupResult({
            chinese: '查询失败',
            phonetic: '',
          });
        } finally {
          setLookupLoading(false);
        }
      }
    }, 800); // 800ms 长按触发
  };

  // 长按查词 - 取消长按
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 关闭查词弹窗
  const closeLookupPopup = () => {
    setLookupWord(null);
    setLookupResult(null);
  };

  // 双击查词（PC端）
  const handleDoubleClick = async (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim().toLowerCase();

    if (!text || !/^[a-zA-Z\-']+$/.test(text)) return;

    const word = text;

    setPopupPosition({ x: e.clientX, y: e.clientY + 10 });
    setLookupWord(word);
    setLookupLoading(true);
    setLookupResult(null);

    try {
      const result = await api.quickLookup(word);
      setLookupResult({
        chinese: result.chineseDefinition || '未找到释义',
        phonetic: result.phoneticUs || '',
      });
    } catch (error) {
      setLookupResult({
        chinese: '查询失败',
        phonetic: '',
      });
    } finally {
      setLookupLoading(false);
    }
  };

  // 渲染带高亮的文本
  const renderHighlightedText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const word = part.slice(2, -2);
        return (
          <span key={index} className="text-blue-600 font-semibold bg-blue-50 px-1 rounded">
            {word}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // 计算进度
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
          <p className="text-sm text-gray-400 mt-2">预计需要 2-5 秒</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center py-20">
          <p className="text-gray-600">生成失败，请重试</p>
          <Button className="mt-4" onClick={() => navigate('/vocabulary')}>
            返回生词本
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* 返回按钮 */}
      <Button variant="ghost" className="mb-6" onClick={() => {
        window.speechSynthesis.cancel();
        // 如果是从会话记录进入，返回会话记录页；否则返回生词本
        navigate(dialogueId ? '/dialogues' : '/vocabulary');
      }}>
        <ArrowLeft className="size-4 mr-2" />
        {dialogueId ? '返回会话记录' : '返回生词本'}
      </Button>

      {/* 标题 */}
      <h1 className="text-2xl font-semibold mb-2">对话音频</h1>
      {data.topic && (
        <p className="text-blue-600 font-medium mb-1">主题：{data.topic}</p>
      )}
      <p className="text-gray-500 mb-6">场景：{data.scene}</p>

      {/* 单词标签 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {data.words.map((word, index) => (
          <span
            key={index}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
          >
            {word}
          </span>
        ))}
      </div>

      {/* 对话内容 - 支持长按/双击查词 */}
      <div
        className="bg-white border rounded-lg p-6 mb-6 space-y-4 select-text"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        {data.dialogue.map((line, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg transition-colors ${
              index === currentLineIndex && playing ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  line.speaker === 'A'
                    ? 'bg-blue-500 text-white'
                    : 'bg-pink-500 text-white'
                }`}
              >
                {line.speaker}
              </span>
              <div className="flex-1">
                <p className="text-gray-800 leading-relaxed">
                  {renderHighlightedText(line.text)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 播放器 */}
      <div className="bg-white border rounded-lg p-4">
        {/* 口音显示 */}
        <div className="mb-4 text-sm text-gray-600">
          当前口音：<span className="font-medium text-gray-800">
            {ACCENT_OPTIONS.find(o => o.value === accent)?.flag} {ACCENT_OPTIONS.find(o => o.value === accent)?.label}
          </span>
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>第 {currentLineIndex + 1}/{data.dialogue.length} 句</span>
            <span>共 {data.dialogue.length} 轮对话</span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" size="lg" onClick={handleReplay}>
            <RotateCcw className="size-5" />
          </Button>
          <Button size="lg" className="w-20" onClick={togglePlay}>
            {playing ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {/* 重新生成（仅新生对话时显示） */}
      {!dialogueId && (
        <div className="text-center mt-6">
          <Button variant="outline" onClick={() => {
            window.speechSynthesis.cancel();
            generateDialogue();
          }}>
            重新生成
          </Button>
        </div>
      )}

      {/* 长按/双击查词弹窗 */}
      {lookupWord && (
        <div
          className="fixed inset-0 z-50"
          onClick={closeLookupPopup}
        >
          <div
            className="fixed bg-white rounded-lg shadow-xl border p-4 min-w-[200px] max-w-[280px]"
            style={{
              left: Math.min(Math.max(popupPosition.x - 100, 10), window.innerWidth - 290),
              top: Math.min(popupPosition.y + 20, window.innerHeight - 160),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-semibold text-blue-600">{lookupWord}</span>
              <button
                onClick={closeLookupPopup}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-4" />
              </button>
            </div>
            {lookupLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="size-5 animate-spin text-blue-600" />
              </div>
            ) : lookupResult && (
              <div>
                {lookupResult.phonetic && (
                  <p className="text-sm text-gray-500 mb-1">{lookupResult.phonetic}</p>
                )}
                <p className="text-gray-800">{lookupResult.chinese}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2 pt-2 border-t">
              双击/长按单词可查看释义
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
