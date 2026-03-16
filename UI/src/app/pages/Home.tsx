import { useState, useRef } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { WordCard } from '../components/word/WordCard';
import { api } from '../services/api';
import { Word } from '../types/word';
import { Search, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export function Home() {
  const [searchWord, setSearchWord] = useState('');
  const [word, setWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(false);
  const streamingBuffer = useRef('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // 播放发音
  const playAudio = (url: string, type: string) => {
    if (!url) return;
    setPlayingAudio(type);
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => {
      toast.error('播放失败');
      setPlayingAudio(null);
    };
    audio.play();
  };

  // 实时解析 JSON 字段并更新显示
  const parseAndUpdatePartial = (text: string, prevWord: Word | null): Partial<Word> => {
    // 清理 markdown 代码块标记
    let cleanText = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    const result: Partial<Word> = {};

    // 尝试提取 chineseDefinition
    const defMatch = cleanText.match(/"chineseDefinition"\s*:\s*"([^"]*)"/);
    if (defMatch) {
      result.chineseDefinition = defMatch[1];
    }

    // 尝试提取 sentences（逐个提取）
    const sentenceMatches = cleanText.matchAll(/"en"\s*:\s*"([^"]*)"[,\s]*"zh"\s*:\s*"([^"]*)"/g);
    const sentences: Array<{ en: string; zh: string }> = [];
    for (const match of sentenceMatches) {
      sentences.push({ en: match[1], zh: match[2] });
    }
    if (sentences.length > 0) {
      result.sentences = sentences;
    }

    // 尝试提取 synonyms（逐个提取）
    const synonymWordMatches = cleanText.matchAll(/"word"\s*:\s*"([^"]*)"/g);
    const synonymDiffMatches = cleanText.matchAll(/"difference"\s*:\s*"([^"]*)"/g);
    const synonymExMatches = cleanText.matchAll(/"example"\s*:\s*"([^"]*)"/g);

    const words: string[] = [...synonymWordMatches].map(m => m[1]);
    const diffs: string[] = [...synonymDiffMatches].map(m => m[1]);
    const examples: string[] = [...synonymExMatches].map(m => m[1]);

    if (words.length > 0) {
      const synonyms = words.map((w, i) => ({
        word: w,
        difference: diffs[i] || '',
        example: examples[i] || '',
      }));
      result.synonyms = synonyms;
    }

    return result;
  };

  const handleSearch = async () => {
    if (!searchWord.trim()) {
      toast.error('请输入单词');
      return;
    }

    setLoading(true);
    setWord(null);
    streamingBuffer.current = '';

    try {
      // 使用流式查词
      await api.lookupWordStream(searchWord.trim(), {
        onDictionaryData: (data) => {
          if (data) {
            // 立即显示词典数据（音标、英文释义、词性）
            setWord({
              id: `temp-${Date.now()}`,
              word: searchWord.trim().toLowerCase(),
              phoneticUs: data.phoneticUs,
              phoneticUk: data.phoneticUk,
              englishDefinition: data.englishDefinition,
              partOfSpeech: data.partOfSpeech,
              chineseDefinition: '',
              sentences: data.sentences || [],  // API 自带的例句先显示
              synonyms: [],
              antonyms: data.antonyms || [],  // API 自带的反义词
              audioUs: data.audioUs,
              audioUk: data.audioUk,
              createdAt: new Date().toISOString(),
              lastReviewedAt: null,
              reviewCount: 0,
              isSaved: false,
            });
          }
        },
        onChunk: (content) => {
          // 累积内容用于解析
          streamingBuffer.current += content;

          // 尝试解析部分内容并更新显示（不展示原始 JSON）
          setWord(prev => {
            if (!prev) return prev;
            const partial = parseAndUpdatePartial(streamingBuffer.current, prev);
            return {
              ...prev,
              chineseDefinition: partial.chineseDefinition || prev.chineseDefinition,
              sentences: partial.sentences?.length ? partial.sentences : prev.sentences,
              synonyms: partial.synonyms?.length ? partial.synonyms : prev.synonyms,
            };
          });
        },
        onComplete: async (result) => {
          // 合并数据，保留 antonyms（来自词典API）和其他 LLM 补充的数据
          setWord(prev => {
            const finalResult = {
              ...prev,
              ...result,
              sentences: result.sentences || prev?.sentences || [],
              synonyms: result.synonyms || [],
              antonyms: prev?.antonyms || result.antonyms || [],  // 保留词典API的反义词
            };

            // 自动保存到生词本（静默）
            api.addWord({
              word: finalResult.word,
              phoneticUs: finalResult.phoneticUs,
              phoneticUk: finalResult.phoneticUk,
              chineseDefinition: finalResult.chineseDefinition,
              englishDefinition: finalResult.englishDefinition,
              partOfSpeech: finalResult.partOfSpeech,
              audioUs: finalResult.audioUs,
              audioUk: finalResult.audioUk,
              antonyms: finalResult.antonyms,
              sentences: finalResult.sentences,
              synonyms: finalResult.synonyms,
            }).catch(() => {
              // 静默处理（已存在或其他错误）
            });

            return finalResult;
          });
          setLoading(false);
          streamingBuffer.current = '';
        },
        onError: (error) => {
          toast.error(error || '查词失败');
          setLoading(false);
        },
      });
    } catch (error) {
      toast.error('查词失败，请稍后重试');
      console.error(error);
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 搜索区域 */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-6">查词</h1>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="输入英文单词..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            onKeyPress={handleKeyPress}
            className="text-lg"
            disabled={loading}
          />
          <Button
            onClick={handleSearch}
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                查询中
              </>
            ) : (
              <>
                <Search className="size-4 mr-2" />
                查询
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 结果区域 */}
      {word && (
        <WordCard
          word={word}
          onPlayAudio={playAudio}
          playingAudio={playingAudio}
        />
      )}

      {/* 空状态 */}
      {!word && !loading && (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="size-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">在上方输入单词开始查询</p>
          <p className="text-sm mb-4">支持查询单词的音标、释义、例句和近义词</p>
          <div className="mt-6 inline-flex gap-2 flex-wrap justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchWord('determine');
                setTimeout(() => handleSearch(), 100);
              }}
            >
              试试 "determine"
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchWord('brilliant');
                setTimeout(() => handleSearch(), 100);
              }}
            >
              试试 "brilliant"
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchWord('eager');
                setTimeout(() => handleSearch(), 100);
              }}
            >
              试试 "eager"
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
