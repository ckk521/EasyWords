/**
 * Edge TTS 服务（微软免费 TTS）
 * 无需 API Key，完全免费
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

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

/**
 * 使用 Edge TTS 合成语音
 */
export async function synthesizeSpeech(options: TTSOptions): Promise<TTSResult> {
  const { text, lang = 'en-US', speaker = 'A', speed = 0.9 } = options;

  const voiceConfig = EDGE_VOICES[lang] || EDGE_VOICES['en-US'];
  const voiceName = speaker === 'A' ? voiceConfig.male : voiceConfig.female;

  const tempFile = join(tmpdir(), `tts-${randomUUID()}.mp3`);

  try {
    // 语速转换：0.9 -> -10%
    const ratePercent = Math.round((speed - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    await execAsync(
      `edge-tts --voice "${voiceName}" --text "${text.replace(/"/g, '\\"')}" --write-media "${tempFile}" --rate="${rateStr}"`,
      { timeout: 30000 }
    );

    const audioBuffer = await readFile(tempFile);
    await unlink(tempFile).catch(() => {});

    return { audioData: audioBuffer, format: 'mp3' };
  } catch (error: any) {
    await unlink(tempFile).catch(() => {});
    throw new Error(`Edge TTS 失败: ${error.message}`);
  }
}
