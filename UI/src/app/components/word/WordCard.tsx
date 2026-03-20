import { Word } from '../../types/word';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Loader2, Volume2 } from 'lucide-react';

interface WordCardProps {
  word: Word;
  showFullDetails?: boolean;
  onPlayAudio?: (url: string, type: string) => void;
  playingAudio?: string | null;
}

// 判断是否在生成中
const isGenerating = (word: Word) => {
  return !word.chineseDefinition || (!word.synonyms || word.synonyms.length === 0);
};

export function WordCard({ word, showFullDetails = true, onPlayAudio, playingAudio }: WordCardProps) {
  const generating = isGenerating(word);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-2xl">{word.word}</CardTitle>
              {word.partOfSpeech && (
                <Badge variant="secondary" className="text-xs">{word.partOfSpeech}</Badge>
              )}
              {generating && (
                <Loader2 className="size-4 animate-spin text-blue-500" />
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                US: {word.phoneticUs}
                {word.audioUs && onPlayAudio && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 ml-1"
                    onClick={() => onPlayAudio(word.audioUs!, 'us')}
                    disabled={playingAudio === 'us'}
                  >
                    <Volume2 className={`size-3 ${playingAudio === 'us' ? 'animate-pulse text-blue-500' : ''}`} />
                  </Button>
                )}
              </span>
              <span className="flex items-center gap-1">
                UK: {word.phoneticUk}
                {word.audioUk && onPlayAudio && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 ml-1"
                    onClick={() => onPlayAudio(word.audioUk!, 'uk')}
                    disabled={playingAudio === 'uk'}
                  >
                    <Volume2 className={`size-3 ${playingAudio === 'uk' ? 'animate-pulse text-blue-500' : ''}`} />
                  </Button>
                )}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 中文释义 */}
        <div>
          <p className="text-base text-gray-900">
            {word.chineseDefinition || (
              <span className="text-gray-400">正在生成释义...</span>
            )}
          </p>
        </div>

        {/* 英文释义 */}
        <div>
          <p className="text-sm text-gray-700 italic">{word.englishDefinition}</p>
        </div>

        {showFullDetails && (
          <>
            <Separator />

            {/* 例句 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">📝 例句</Badge>
                <span className="text-xs text-gray-500">({word.sentences.length})</span>
              </div>
              <div className="space-y-3">
                {word.sentences.length === 0 ? (
                  <p className="text-sm text-gray-400 pl-4">正在生成例句...</p>
                ) : (
                  word.sentences.map((sentence, index) => (
                    <div key={index} className="pl-4 border-l-2 border-gray-200">
                      <p className="text-sm text-gray-900 mb-1">{sentence.en}</p>
                      <p className="text-xs text-gray-600">
                        {sentence.zh || <span className="text-gray-400">翻译中...</span>}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Separator />

            {/* 近义词 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">🔄 近义词</Badge>
                <span className="text-xs text-gray-500">({word.synonyms.length})</span>
              </div>
              <div className="space-y-3">
                {word.synonyms.length === 0 ? (
                  <p className="text-sm text-gray-400 pl-4">正在生成近义词...</p>
                ) : (
                  word.synonyms.map((synonym, index) => (
                    <div key={index} className="pl-4 border-l-2 border-blue-200">
                      <p className="text-sm font-medium text-gray-900 mb-1">{synonym.word}</p>
                      {synonym.difference && (
                        <p className="text-xs text-gray-700 mb-1">
                          <span className="font-medium">区别：</span>
                          {synonym.difference}
                        </p>
                      )}
                      {synonym.example && (
                        <p className="text-xs text-gray-600 italic">{synonym.example}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 反义词 */}
            {word.antonyms && word.antonyms.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="bg-red-50">⚡ 反义词</Badge>
                    <span className="text-xs text-gray-500">({word.antonyms.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-4">
                    {word.antonyms.map((antonym, index) => (
                      <span
                        key={index}
                        className="text-sm px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200"
                      >
                        {antonym}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
