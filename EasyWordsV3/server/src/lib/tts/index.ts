/**
 * Edge TTS 服务（微软免费 TTS）
 * 无需 API Key，完全免费
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { randomUUID, createHash } from 'crypto';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

// Edge TTS 英语音色配置
const EDGE_VOICES: Record<string, { male: string; female: string }> = {
  'en-US': { male: 'en-US-GuyNeural', female: 'en-US-JennyNeural' },
  'en-GB': { male: 'en-GB-RyanNeural', female: 'en-GB-SoniaNeural' },
  'en-AU': { male: 'en-AU-WilliamNeural', female: 'en-AU-NatashaNeural' },
  'en-IN': { male: 'en-IN-PrabhatNeural', female: 'en-IN-NeerjaNeural' },
};

interface TTSOptions {
  text: string;
  lang?: string;
  speaker?: 'A' | 'B';
  speed?: number;
}

interface TTSResult {
  audioData: Buffer;
  format: string;
}

// 内存缓存
const audioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 100;

/**
 * 生成缓存 key
 */
function getCacheKey(text: string, lang: string, speaker: string, speed: number): string {
  return createHash('md5').update(`${text}|${lang}|${speaker}|${speed}`).digest('hex');
}

/**
 * 使用 Edge TTS 合成语音
 */
export async function synthesizeSpeech(options: TTSOptions): Promise<TTSResult> {
  const { text, lang = 'en-US', speaker = 'A', speed = 1.0 } = options;

  const voiceConfig = EDGE_VOICES[lang] || EDGE_VOICES['en-US'];
  const voiceName = speaker === 'A' ? voiceConfig.male : voiceConfig.female;

  // 检查缓存
  const cacheKey = getCacheKey(text, lang, speaker, speed);
  const cached = audioCache.get(cacheKey);
  if (cached) {
    return { audioData: cached, format: 'mp3' };
  }

  const tempFile = join(tmpdir(), `tts-${randomUUID()}.mp3`);

  try {
    // 语速转换：1.0 -> 0%, 1.1 -> +10%
    const ratePercent = Math.round((speed - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    // 使用 edge-tts 命令
    await execAsync(
      `edge-tts --voice "${voiceName}" --text "${text.replace(/"/g, '\\"')}" --write-media "${tempFile}" --rate="${rateStr}"`,
      {
        timeout: 15000,  // 减少超时时间
        maxBuffer: 1024 * 1024 * 5  // 5MB buffer
      }
    );

    const audioBuffer = await readFile(tempFile);

    // 异步删除临时文件
    unlink(tempFile).catch(() => {});

    // 存入缓存
    if (audioCache.size >= MAX_CACHE_SIZE) {
      // 删除最早的缓存
      const firstKey = audioCache.keys().next().value;
      if (firstKey) {
        audioCache.delete(firstKey);
      }
    }
    audioCache.set(cacheKey, audioBuffer);

    return { audioData: audioBuffer, format: 'mp3' };
  } catch (error: any) {
    unlink(tempFile).catch(() => {});
    throw new Error(`Edge TTS 失败: ${error.message}`);
  }
}

/**
 * 清除缓存
 */
export function clearTTSCache(): void {
  audioCache.clear();
}
