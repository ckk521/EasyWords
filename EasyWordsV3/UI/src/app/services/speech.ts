// 语音服务 - TTS 和 ASR

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// ============================================
// TTS 文字转语音 - Web Audio API
// ============================================

interface TTSOptions {
  text: string;
  lang?: 'en-US' | 'en-GB' | 'en-AU';
  speaker?: 'A' | 'B';  // A = male, B = female
  speed?: number;
}

// Web Audio API 全局上下文
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let isPlaying = false;

/**
 * 获取或创建 AudioContext
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * 检查音频是否已解锁
 */
export function isAudioUnlocked(): boolean {
  if (!audioContext) return false;
  return audioContext.state === 'running';
}

/**
 * 解锁音频播放（必须在用户交互的同步上下文中调用）
 * Safari/iOS 需要在用户点击/触摸事件中调用此函数
 */
export function unlockAudio(): void {
  console.log('[TTS] 解锁音频, 当前状态:', audioContext?.state);

  const ctx = getAudioContext();

  // 如果 AudioContext 是 suspended 状态，恢复它
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      console.log('[TTS] AudioContext 已恢复, 状态:', ctx.state);
    }).catch((e) => {
      console.warn('[TTS] AudioContext 恢复失败:', e);
    });
  }

  // 创建一个静音的振荡器来确保音频上下文被激活
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.001; // 几乎静音
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.001);
    console.log('[TTS] 静音振荡器已播放');
  } catch (e) {
    console.warn('[TTS] 静音振荡器播放失败:', e);
  }
}

/**
 * 移除文本中的 emoji 和特殊符号
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
    // 使用服务端 TTS
    await speakWithServerTTS(cleanText, lang, speaker, speed);
  } catch (error: any) {
    console.error('[TTS] 服务端 TTS 失败:', error.message);

    // 如果是被浏览器阻止，抛出错误
    if (error.message?.includes('被浏览器阻止')) {
      throw error;
    }

    // 其他错误尝试降级到浏览器原生 TTS
    if ('speechSynthesis' in window) {
      console.log('[TTS] 尝试使用浏览器原生 TTS');
      return await speakWithWebSpeech(cleanText, lang, speaker, speed);
    }

    throw error;
  }
}

/**
 * 停止播放
 */
export function stopSpeaking(): void {
  // 停止 Web Audio
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // 忽略已停止的错误
    }
    currentSource = null;
  }
  isPlaying = false;

  // 停止 Web Speech
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

/**
 * 检查是否正在播放
 */
export function isSpeaking(): boolean {
  if (isPlaying) return true;
  if ('speechSynthesis' in window && speechSynthesis.speaking) {
    return true;
  }
  return false;
}

/**
 * 使用 Web Audio API 播放音频
 */
async function playWithWebAudio(arrayBuffer: ArrayBuffer): Promise<void> {
  const ctx = getAudioContext();

  // 确保 AudioContext 是运行状态
  if (ctx.state === 'suspended') {
    console.log('[TTS] AudioContext 被暂停，尝试恢复...');
    await ctx.resume();
  }

  console.log('[TTS] AudioContext 状态:', ctx.state);

  // 解码音频
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  return new Promise((resolve, reject) => {
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    currentSource = source;
    isPlaying = true;

    source.onended = () => {
      console.log('[TTS] Web Audio 播放完成');
      isPlaying = false;
      currentSource = null;
      resolve();
    };

    source.onerror = (e: any) => {
      console.error('[TTS] Web Audio 播放错误:', e);
      isPlaying = false;
      currentSource = null;
      reject(new Error('音频播放失败'));
    };

    try {
      source.start();
      console.log('[TTS] Web Audio 开始播放');
    } catch (e: any) {
      console.error('[TTS] Web Audio start() 失败:', e);
      isPlaying = false;
      currentSource = null;
      reject(new Error('音频播放被浏览器阻止，请点击页面后重试'));
    }
  });
}

/**
 * 使用服务端 TTS（Web Audio API 播放）
 */
async function speakWithServerTTS(text: string, lang: string, speaker: string, speed: number): Promise<void> {
  try {
    console.log('[TTS] 请求服务端 TTS, 文本:', text.substring(0, 50) + '...');

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

    console.log('[TTS] 收到音频数据, 格式:', data.format);

    // Base64 转 ArrayBuffer
    const binaryString = atob(data.audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    // 使用 Web Audio API 播放
    await playWithWebAudio(arrayBuffer);
  } catch (error) {
    console.error('[TTS] 服务端 TTS 错误:', error);
    throw error;
  }
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

    // 超时保护
    const timeoutId = setTimeout(() => {
      console.warn('[TTS] 播放超时，强制结束');
      speechSynthesis.cancel();
      doResolve('超时');
    }, 30000);

    // Chrome 首次播放修复
    const warmupAndSpeak = () => {
      const warmup = new SpeechSynthesisUtterance('');
      warmup.rate = 10;
      speechSynthesis.speak(warmup);

      setTimeout(() => {
        console.log('[TTS] 加入播放队列');
        speechSynthesis.speak(utterance);

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
  options: SpeechRecognitionOptions = {},
  onEnd?: () => void  // 新增：识别结束回调
): {
  start: () => void;
  stop: () => Promise<string>;
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

  console.log('[ASR] 创建识别器, lang:', recognition.lang, 'continuous:', recognition.continuous);

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    console.log('[ASR] onresult 触发, resultIndex:', event.resultIndex, 'results.length:', event.results.length);
    console.log('[ASR] 之前的 finalTranscript:', finalTranscript);
    console.log('[ASR] 之前的 interimTranscript:', interimTranscript);

    interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      console.log('[ASR] 结果:', i, 'isFinal:', result.isFinal, 'text:', result[0].transcript);
      if (result.isFinal) {
        finalTranscript += result[0].transcript + ' ';
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    const fullTranscript = (finalTranscript + interimTranscript).trim();
    console.log('[ASR] 更新后完整文本:', fullTranscript);

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

    console.log('[ASR] 识别错误类型:', errorType, 'message:', errorEvent.message);

    switch (errorType) {
      case 'not-allowed':
        errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风';
        break;
      case 'no-speech':
        errorMessage = '未检测到语音，请对准麦克风说话后重试';
        break;
      case 'audio-capture':
        errorMessage = '无法捕获音频，请检查麦克风是否正常工作';
        break;
      case 'network':
        errorMessage = '网络错误，语音识别需要连接 Google 服务器，请检查网络或使用 VPN';
        break;
      case 'aborted':
        errorMessage = '识别被中断';
        break;
      case 'language-not-supported':
        errorMessage = '不支持的语言';
        break;
      case 'service-not-allowed':
        errorMessage = '语音识别服务不可用，请确保使用 HTTPS 或 localhost';
        break;
      default:
        if (errorType !== 'no-speech' && errorType !== 'aborted') {
          errorMessage = `语音识别失败: ${errorType}。如果在国内使用，可能需要 VPN 访问 Google 服务器`;
        } else {
          errorMessage = `语音识别失败: ${errorType}`;
        }
    }

    listening = false;
    onError(errorMessage);

    if (resolveStop) {
      const finalText = (finalTranscript + interimTranscript).trim();
      resolveStop(finalText);
      resolveStop = null;
    }
  };

  recognition.onend = () => {
    console.log('[ASR] onend 触发, listening:', listening, 'resolveStop:', !!resolveStop);
    console.log('[ASR] onend 时的 finalTranscript:', finalTranscript);
    console.log('[ASR] onend 时的 interimTranscript:', interimTranscript);
    listening = false;

    if (resolveStop) {
      const finalText = (finalTranscript + interimTranscript).trim();
      console.log('[ASR] 返回最终文本:', finalText);
      resolveStop(finalText);
      resolveStop = null;
    }

    // 调用外部 onEnd 回调，让调用方知道识别器已停止
    if (onEnd) {
      onEnd();
    }
  };

  recognition.onstart = () => {
    console.log('[ASR] onstart 触发, 保留的 finalTranscript:', finalTranscript, 'interimTranscript:', interimTranscript);
    listening = true;
    // 不再清空 transcript，保留已识别的内容
    // 这样在识别器重启时不会丢失之前说的内容
  };

  return {
    start: (clearPrevious: boolean = false) => {
      if (!listening) {
        // 只在明确要求清空时才清空（新对话开始时）
        // 重启识别器时不清空，保留已识别内容
        if (clearPrevious) {
          finalTranscript = '';
          interimTranscript = '';
        }
        console.log('[ASR] 调用 start(), clearPrevious:', clearPrevious, '已有文本:', (finalTranscript + interimTranscript).trim());
        try {
          recognition.start();
        } catch (e: any) {
          console.error('[ASR] start() 出错:', e);
          onError('启动语音识别失败: ' + (e.message || e));
        }
      }
    },
    stop: () => {
      return new Promise((resolve) => {
        resolveStop = resolve;
        console.log('[ASR] 调用 stop(), 当前文本:', finalTranscript, interimTranscript);
        try {
          recognition.stop();
        } catch (e) {
          console.error('[ASR] stop() 出错:', e);
        }
        listening = false;

        setTimeout(() => {
          if (resolveStop) {
            const finalText = (finalTranscript + interimTranscript).trim();
            console.log('[ASR] 超时，返回当前文本:', finalText);
            resolve(finalText);
            resolveStop = null;
          }
        }, 1000);
      });
    },
    isListening: () => listening,
  };
}
