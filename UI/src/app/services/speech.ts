// 语音服务 - TTS 和 ASR

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// ============================================
// TTS 文字转语音
// ============================================

interface TTSOptions {
  text: string;
  lang?: 'en-US' | 'en-GB' | 'en-AU';
  speaker?: 'A' | 'B';  // A = male, B = female
  speed?: number;
}

let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

/**
 * 移除文本中的 emoji 和特殊符号（TTS 不需要读这些）
 */
function removeEmojis(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '')
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 合成并播放语音
 */
export async function speakText(options: TTSOptions): Promise<void> {
  const { text, lang = 'en-US', speaker = 'B', speed = 1.0 } = options;

  if (!text.trim()) return;

  // 停止当前播放
  stopSpeaking();

  // 移除 emoji
  const cleanText = removeEmojis(text);
  if (!cleanText.trim()) return;

  try {
    // 使用浏览器原生 TTS
    if ('speechSynthesis' in window) {
      return await speakWithWebSpeech(cleanText, lang, speaker, speed);
    }

    // 降级到服务端 TTS
    return await speakWithServerTTS(cleanText, lang, speaker, speed);
  } catch (error) {
    console.error('TTS 播放失败:', error);
  }
}

/**
 * 停止播放
 */
export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

/**
 * 检查是否正在播放
 */
export function isSpeaking(): boolean {
  if ('speechSynthesis' in window && speechSynthesis.speaking) {
    return true;
  }
  return currentAudio !== null && !currentAudio.paused;
}

/**
 * 使用浏览器原生 Web Speech API
 */
async function speakWithWebSpeech(text: string, lang: string, speaker: string, speed: number): Promise<void> {
  console.log('[TTS] 开始播放，文本长度:', text.length);

  return new Promise((resolve) => {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = speed;

    // 选择声音的函数
    const selectVoice = () => {
      const voices = speechSynthesis.getVoices();
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));

      if (englishVoices.length > 0) {
        const isFemale = speaker === 'B';
        const genderKeywords = isFemale
          ? ['female', 'woman', 'girl', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'veena', 'alice', 'ellen', 'zira', 'jenny', 'aria', 'natalie']
          : ['male', 'man', 'boy', 'daniel', 'alex', 'tom', 'david', 'mark', 'james', 'richard', 'guy', 'benjamin', 'christopher'];

        const genderVoice = englishVoices.find(v => {
          const nameLower = v.name.toLowerCase();
          return genderKeywords.some(kw => nameLower.includes(kw));
        });

        utterance.voice = genderVoice || englishVoices[0];
        console.log('[TTS] 选择声音:', utterance.voice?.name);
      } else {
        console.warn('[TTS] 没有找到英语声音');
      }
    };

    // 尝试立即选择声音
    selectVoice();

    // 如果声音列表还没加载，等待加载完成
    if (speechSynthesis.getVoices().length === 0) {
      console.log('[TTS] 等待声音列表加载...');
      speechSynthesis.onvoiceschanged = selectVoice;
    }

    let resolved = false;
    const doResolve = (reason: string) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.log('[TTS] 播放结束:', reason);
        resolve();
      }
    };

    utterance.onstart = () => {
      console.log('[TTS] 开始说话');
    };

    utterance.onend = () => {
      doResolve('正常结束');
    };

    utterance.onerror = (e: any) => {
      console.warn('[TTS] 播放出错:', e?.error || e);
      doResolve('出错: ' + (e?.error || 'unknown'));
    };

    // 超时保护：如果 30 秒内没有播放完成，强制 resolve
    const timeoutId = setTimeout(() => {
      console.warn('[TTS] 播放超时，强制结束');
      speechSynthesis.cancel();
      doResolve('超时');
    }, 30000);

    // Chrome 浏览器首次播放截断问题的修复
    const warmupAndSpeak = () => {
      const warmup = new SpeechSynthesisUtterance('');
      warmup.rate = 10;
      speechSynthesis.speak(warmup);

      setTimeout(() => {
        console.log('[TTS] 加入播放队列');
        speechSynthesis.speak(utterance);

        // 额外检查：如果 1 秒后还没有开始播放，可能是卡住了
        setTimeout(() => {
          if (!resolved && !speechSynthesis.speaking) {
            console.warn('[TTS] 播放未开始，尝试重新播放');
            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
          }
        }, 1000);
      }, 100);
    };

    setTimeout(warmupAndSpeak, 100);
  });
}

/**
 * 使用服务端 TTS（备用方案）
 */
async function speakWithServerTTS(text: string, lang: string, speaker: string, speed: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang, speaker, speed }),
    });

    if (!response.ok) {
      throw new Error('TTS API 调用失败');
    }

    const data = await response.json();

    if (!data.success || !data.audio) {
      throw new Error('TTS 返回数据无效');
    }

    const audioBlob = base64ToBlob(data.audio, `audio/${data.format || 'mp3'}`);
    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudioUrl = audioUrl;

    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      let resolved = false;

      const cleanup = () => {
        if (currentAudio === audio) {
          currentAudio = null;
        }
        if (currentAudioUrl === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          currentAudioUrl = null;
        }
      };

      const doResolve = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve();
        }
      };

      audio.onended = doResolve;
      audio.onerror = () => {
        console.warn('音频播放出错');
        doResolve();
      };

      audio.play().catch(() => {
        console.warn('音频播放启动失败');
        doResolve();
      });
    });
  } catch (error) {
    console.error('服务端 TTS 错误:', error);
  }
}

// ============================================
// ASR 语音识别
// ============================================

interface SpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

/**
 * 检查浏览器是否支持语音识别
 */
export function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * 创建语音识别器
 */
export function createSpeechRecognizer(
  onResult: (result: SpeechRecognitionResult) => void,
  onError: (error: string) => void,
  options: SpeechRecognitionOptions = {}
): {
  start: () => void;
  stop: () => Promise<string>;  // 返回最终识别的文本
  isListening: () => boolean;
} {
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    throw new Error('浏览器不支持语音识别');
  }

  const recognition = new SpeechRecognitionClass();
  let listening = false;
  let finalTranscript = '';
  let interimTranscript = '';
  let resolveStop: ((text: string) => void) | null = null;

  recognition.lang = options.lang || 'en-US';
  recognition.continuous = options.continuous ?? false;
  recognition.interimResults = options.interimResults ?? true;
  recognition.maxAlternatives = options.maxAlternatives ?? 1;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript + ' ';
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    const fullTranscript = (finalTranscript + interimTranscript).trim();

    onResult({
      transcript: fullTranscript,
      confidence: event.results[event.resultIndex]?.[0]?.confidence || 0,
      isFinal: false,
    });
  };

  recognition.onerror = (event: Event) => {
    const errorEvent = event as any;
    const errorType = errorEvent.error || 'unknown';
    let errorMessage = '语音识别失败';

    console.log('[ASR] 识别错误类型:', errorType);

    switch (errorType) {
      case 'not-allowed':
        errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风';
        break;
      case 'no-speech':
        errorMessage = '未检测到语音，请重试';
        break;
      case 'audio-capture':
        errorMessage = '无法捕获音频，请检查麦克风';
        break;
      case 'network':
        errorMessage = '网络错误，请检查网络连接';
        break;
      case 'aborted':
        errorMessage = '识别被中断';
        break;
      case 'language-not-supported':
        errorMessage = '不支持的语言';
        break;
      default:
        errorMessage = `语音识别失败: ${errorType}`;
    }

    listening = false;
    onError(errorMessage);

    // 如果有等待的 stop，也要 resolve
    if (resolveStop) {
      const finalText = (finalTranscript + interimTranscript).trim();
      resolveStop(finalText);
      resolveStop = null;
    }
  };

  recognition.onend = () => {
    listening = false;

    // 当识别结束时，返回最终文本
    if (resolveStop) {
      const finalText = (finalTranscript + interimTranscript).trim();
      resolveStop(finalText);
      resolveStop = null;
    }
  };

  recognition.onstart = () => {
    listening = true;
    finalTranscript = '';
    interimTranscript = '';
  };

  return {
    start: () => {
      if (!listening) {
        finalTranscript = '';
        interimTranscript = '';
        recognition.start();
      }
    },
    stop: () => {
      return new Promise((resolve) => {
        resolveStop = resolve;
        recognition.stop();
        listening = false;

        // 超时保护：如果 1 秒内没有 onend 回调，也返回当前结果
        setTimeout(() => {
          if (resolveStop) {
            const finalText = (finalTranscript + interimTranscript).trim();
            resolve(finalText);
            resolveStop = null;
          }
        }, 1000);
      });
    },
    isListening: () => listening,
  };
}

// ============================================
// 工具函数
// ============================================

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
