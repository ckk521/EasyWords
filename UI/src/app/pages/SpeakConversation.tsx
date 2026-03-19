import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { speakApi } from '../services/speakApi';
import { speakText, stopSpeaking, createSpeechRecognizer, isSpeechRecognitionSupported, unlockAudio, isAudioUnlocked } from '../services/speech';
import { SpeakConversation as SpeakConversationType, SpeakMessage, Feedback, ConversationState, RecordingState, GrammarError, BetterExpression, GoodExpression } from '../types/speak';
import {
  Loader2,
  ArrowLeft,
  Mic,
  Square,
  Volume2,
  VolumeX,
  AlertCircle,
  Sparkles,
  Phone,
  PhoneOff,
} from 'lucide-react';
import { toast } from 'sonner';

export function SpeakConversation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const conversationId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<SpeakConversationType | null>(null);
  const [messages, setMessages] = useState<SpeakMessage[]>([]);
  const [inputText, setInputText] = useState('');

  // 状态管理
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isFreeTalkMode, setIsFreeTalkMode] = useState(false);

  // 反馈相关
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [endingConversation, setEndingConversation] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const interimTextRef = useRef<string>('');

  // 自由对话模式相关 Refs
  const freeTalkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const hasSpokenRef = useRef<boolean>(false);
  const isFreeTalkModeRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);
  const isCountingDownRef = useRef<boolean>(false); // 是否正在倒计时

  // 自由对话模式状态
  const [freeTalkCountdown, setFreeTalkCountdown] = useState<number | null>(null);
  const [freeTalkStatus, setFreeTalkStatus] = useState<'listening' | 'waiting' | 'processing'>('listening');

  const MAX_RETRY_COUNT = 3;

  // 语音功能支持状态
  const [speechSupported, setSpeechSupported] = useState(isSpeechRecognitionSupported());
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (conversationId) {
      loadConversation();
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      // 清理自由对话模式的定时器
      if (freeTalkTimeoutRef.current) {
        clearTimeout(freeTalkTimeoutRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
      }
      stopSpeaking();
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, feedback]);

  // 同步 isFreeTalkMode 状态到 ref
  useEffect(() => {
    isFreeTalkModeRef.current = isFreeTalkMode;
  }, [isFreeTalkMode]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const data = await speakApi.getConversation(conversationId!);
      if (data) {
        setConversation(data);
        setMessages(data.messages);
        setIsFreeTalkMode(data.mode === 'free-talk');
        // 如果对话已有反馈，设置反馈状态
        if (data.feedback) {
          setFeedback(data.feedback);
        }

        // 如果对话刚开始（只有开场白），播放开场白语音
        // 注意：Safari 需要用户交互才能播放音频，如果音频未解锁，等待用户点击播放
        if (data.messages.length === 1 && data.messages[0].role === 'assistant' && !data.endedAt) {
          // 延迟播放，确保页面已渲染
          setTimeout(() => {
            // 只有在音频已解锁时才自动播放（Safari 限制）
            if (isAudioUnlocked()) {
              setIsPlayingAudio(true);
              speakText({
                text: data.messages[0].content,
                lang: 'en-US',
                speaker: 'B',
                speed: 1.0,
              }).catch(console.error).finally(() => {
                setIsPlayingAudio(false);
              });
            }
            // 如果未解锁，用户需要点击播放按钮
          }, 300);
        }
      } else {
        toast.error('对话不存在');
        navigate('/speak');
      }
    } catch (error) {
      toast.error('加载失败');
      navigate('/speak');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 按住说话 - 开始录音
  const handleRecordingStart = () => {
    if (conversationState === 'speaking' || conversationState === 'thinking') return;

    // 停止当前播放的音频
    stopSpeaking();
    setIsPlayingAudio(false);

    // 解锁音频播放（Safari 需要）
    unlockAudio();

    // 检查浏览器是否支持语音识别
    if (!speechSupported) {
      toast.error('您的浏览器不支持语音识别，请使用文本输入');
      return;
    }

    setRecordingState('recording');
    setRecordingTime(0);
    interimTextRef.current = '';

    // 开始计时 - 使用单独的 ref 追踪时间避免严格模式问题
    const startTime = Date.now();
    recordingTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setRecordingTime(elapsed);

      // 60 秒自动停止
      if (elapsed >= 60) {
        handleRecordingEnd();
      }
    }, 100);

    // 创建语音识别器
    try {
      speechRecognizerRef.current = createSpeechRecognizer(
        (result) => {
          // 实时更新识别结果
          interimTextRef.current = result.transcript;
          setInputText(result.transcript);

          // 不再自动发送，等用户松开按钮后再发送
          // 用户可以继续说话，直到松开按钮或达到 60 秒
        },
        (error) => {
          setRecordingState('idle');
          toast.error(error);
        },
        {
          lang: 'en-US',
          continuous: true,  // 改为连续识别模式，让用户可以持续说话
          interimResults: true,
        }
      );

      speechRecognizerRef.current.start();
    } catch (error) {
      setRecordingState('idle');
      toast.error('无法启动语音识别，请检查麦克风权限');
    }
  };

  // 按住说话 - 结束录音
  const handleRecordingEnd = async () => {
    if (recordingState !== 'recording') return;

    setRecordingState('processing');
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // 停止语音识别并等待最终结果
    if (speechRecognizerRef.current) {
      try {
        // stop() 现在返回 Promise，会等待识别完全结束后返回最终文本
        const finalText = await speechRecognizerRef.current.stop();
        speechRecognizerRef.current = null;

        if (finalText.trim()) {
          sendMessage(finalText.trim());
        } else {
          setRecordingState('idle');
        }
      } catch (error) {
        speechRecognizerRef.current = null;
        setRecordingState('idle');
      }
    } else {
      setRecordingState('idle');
    }
  };

  // ================== 自由对话模式 ==================

  // 开始自由对话模式
  const startFreeTalkMode = () => {
    if (conversationState === 'speaking' || conversationState === 'thinking') return;
    if (!speechSupported) {
      toast.error('您的浏览器不支持语音识别');
      return;
    }

    // 解锁音频播放（Safari 需要）
    unlockAudio();

    setIsFreeTalkMode(true);
    setFreeTalkStatus('listening');
    retryCountRef.current = 0; // 重置重试计数
    isCountingDownRef.current = false; // 重置倒计时状态
    startFreeTalkListening();
  };

  // 停止自由对话模式
  const stopFreeTalkMode = () => {
    setIsFreeTalkMode(false);
    setFreeTalkStatus('listening');
    setFreeTalkCountdown(null);
    retryCountRef.current = 0; // 重置重试计数
    isCountingDownRef.current = false; // 重置倒计时状态

    // 清理所有定时器
    if (freeTalkTimeoutRef.current) {
      clearTimeout(freeTalkTimeoutRef.current);
      freeTalkTimeoutRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }

    // 停止语音识别
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
      speechRecognizerRef.current = null;
    }

    setInputText('');
    interimTextRef.current = '';
  };

  // 开始自由对话监听
  const startFreeTalkListening = () => {
    // 停止当前播放的音频
    stopSpeaking();
    setIsPlayingAudio(false);

    // 确保之前的语音识别已停止
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch (e) {
        // 忽略停止错误
      }
      speechRecognizerRef.current = null;
    }

    setFreeTalkStatus('listening');
    setFreeTalkCountdown(null);
    isCountingDownRef.current = false; // 重置倒计时状态
    interimTextRef.current = '';
    hasSpokenRef.current = false;
    lastSpeechTimeRef.current = 0;

    try {
      speechRecognizerRef.current = createSpeechRecognizer(
        (result) => {
          // 用户正在说话，重置重试计数
          retryCountRef.current = 0;
          isCountingDownRef.current = false; // 取消倒计时状态

          // 用户正在说话
          interimTextRef.current = result.transcript;
          setInputText(result.transcript);
          hasSpokenRef.current = true;
          lastSpeechTimeRef.current = Date.now();

          // 清除超时倒计时（用户开始说话了）
          if (freeTalkTimeoutRef.current) {
            clearTimeout(freeTalkTimeoutRef.current);
            freeTalkTimeoutRef.current = null;
          }
          if (countdownTimeoutRef.current) {
            clearTimeout(countdownTimeoutRef.current);
            countdownTimeoutRef.current = null;
          }
          setFreeTalkCountdown(null);

          // 清除静音检测定时器，重新开始计时
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          // 设置静音检测：1.5秒无新语音则发送
          silenceTimeoutRef.current = setTimeout(() => {
            handleFreeTalkSilence();
          }, 1500);
        },
        (error) => {
          console.error('[FreeTalk] 识别错误:', error, '重试次数:', retryCountRef.current, '正在倒计时:', isCountingDownRef.current);

          // 如果正在倒计时，忽略错误
          if (isCountingDownRef.current) {
            console.log('[FreeTalk] 正在倒计时，忽略错误');
            return;
          }

          // 某些错误不应该重试
          if (error.includes('权限') || error.includes('not-allowed')) {
            toast.error('麦克风权限被拒绝');
            stopFreeTalkMode();
            return;
          }

          // no-speech 和 aborted 是正常情况，不计入重试次数
          if (error.includes('未检测到语音') || error.includes('被中断') || error.includes('no-speech') || error.includes('aborted')) {
            console.log('[FreeTalk] 正常中断，重新监听');
            if (isFreeTalkModeRef.current && !isCountingDownRef.current) {
              setTimeout(() => {
                if (isFreeTalkModeRef.current && !isCountingDownRef.current) {
                  startFreeTalkListening();
                }
              }, 500);
            }
            return;
          }

          // 检查是否应该停止重试
          retryCountRef.current++;
          if (retryCountRef.current > MAX_RETRY_COUNT) {
            console.error('[FreeTalk] 重试次数过多，停止自由对话模式');
            toast.error('语音识别多次失败，已退出自由对话模式');
            stopFreeTalkMode();
            return;
          }

          // 发生错误时，延迟后重新开始监听
          if (isFreeTalkModeRef.current && !isCountingDownRef.current) {
            setTimeout(() => {
              if (isFreeTalkModeRef.current && !isCountingDownRef.current) {
                startFreeTalkListening();
              }
            }, 1000);
          }
        },
        {
          lang: 'en-US',
          continuous: true,
          interimResults: true,
        }
      );

      speechRecognizerRef.current.start();

      // 设置超时保护：5秒内没有开始说话，开始倒计时
      freeTalkTimeoutRef.current = setTimeout(() => {
        if (!hasSpokenRef.current && isFreeTalkModeRef.current) {
          startCountdown();
        }
      }, 5000);

    } catch (error) {
      console.error('[FreeTalk] 启动失败:', error);
      toast.error('无法启动语音识别，请检查麦克风权限');
      stopFreeTalkMode();
    }
  };

  // 开始倒计时（5秒无说话后）
  const startCountdown = () => {
    console.log('[FreeTalk] 开始倒计时');
    isCountingDownRef.current = true;
    setFreeTalkCountdown(3);
    setFreeTalkStatus('waiting');

    // 先停止当前的语音识别，避免干扰
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch (e) {
        // 忽略
      }
      speechRecognizerRef.current = null;
    }

    let countdown = 3;
    const tick = () => {
      if (!isFreeTalkModeRef.current || !isCountingDownRef.current) {
        return; // 已停止
      }
      countdown--;
      if (countdown <= 0) {
        // 倒计时结束，发送或结束
        handleFreeTalkTimeout();
      } else {
        setFreeTalkCountdown(countdown);
        countdownTimeoutRef.current = setTimeout(tick, 1000);
      }
    };

    countdownTimeoutRef.current = setTimeout(tick, 1000);
  };

  // 处理自由对话超时（倒计时结束）
  const handleFreeTalkTimeout = async () => {
    console.log('[FreeTalk] 倒计时结束，当前内容:', interimTextRef.current);
    setFreeTalkCountdown(null);
    isCountingDownRef.current = false;

    // 如果有识别内容，发送
    if (interimTextRef.current.trim()) {
      console.log('[FreeTalk] 发送内容:', interimTextRef.current.trim());
      await sendFreeTalkMessage(interimTextRef.current.trim());
    } else {
      // 没有内容，重新开始监听
      console.log('[FreeTalk] 无内容，重新监听');
      if (isFreeTalkModeRef.current) {
        startFreeTalkListening();
      }
    }
  };

  // 处理静音检测（用户说话后静音1.5秒）
  const handleFreeTalkSilence = async () => {
    if (!isFreeTalkModeRef.current) return;

    // 停止识别
    if (speechRecognizerRef.current) {
      try {
        const finalText = await speechRecognizerRef.current.stop();
        speechRecognizerRef.current = null;

        if (finalText.trim()) {
          await sendFreeTalkMessage(finalText.trim());
        } else if (isFreeTalkModeRef.current) {
          // 没有内容，重新开始监听
          startFreeTalkListening();
        }
      } catch (error) {
        console.error('[FreeTalk] 停止识别失败:', error);
        if (isFreeTalkModeRef.current) {
          startFreeTalkListening();
        }
      }
    }
  };

  // 发送自由对话消息
  const sendFreeTalkMessage = async (text: string) => {
    setFreeTalkStatus('processing');
    setInputText('');

    try {
      // 添加用户消息
      const userMessage: SpeakMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setConversationState('thinking');

      // 获取 AI 回复
      const reply = await speakApi.sendMessage(conversationId!, text);

      // 添加 AI 消息
      setMessages((prev) => [...prev, reply]);
      setConversationState('idle');

      // 播放语音
      // 注意：Safari 需要用户交互才能播放音频
      if (isAudioUnlocked()) {
        setIsPlayingAudio(true);
        speakText({
          text: reply.content,
          lang: 'en-US',
          speaker: 'B',
          speed: 1.0,
        }).catch(console.error).finally(() => {
          setIsPlayingAudio(false);
          // AI 回复完成后，继续监听
          if (isFreeTalkModeRef.current) {
            setTimeout(() => {
              if (isFreeTalkModeRef.current) {
                startFreeTalkListening();
              }
            }, 300);
          }
        });
      } else {
        // 音频未解锁，直接继续监听
        if (isFreeTalkModeRef.current) {
          setTimeout(() => {
            if (isFreeTalkModeRef.current) {
              startFreeTalkListening();
            }
          }, 300);
        }
      }

    } catch (error) {
      toast.error('发送失败');
      setConversationState('idle');
      // 发生错误时继续监听
      if (isFreeTalkModeRef.current) {
        startFreeTalkListening();
      }
    }
  };

  // ================== 自由对话模式结束 ==================

  // 发送消息
  const sendMessage = async (text: string) => {
    if (!text.trim()) {
      setRecordingState('idle');
      return;
    }

    // 停止当前播放的音频
    stopSpeaking();
    setIsPlayingAudio(false);

    // 添加用户消息
    const userMessage: SpeakMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setRecordingState('idle');
    setConversationState('thinking');
    setInputText('');

    try {
      // 获取 AI 回复
      const reply = await speakApi.sendMessage(conversationId!, text);

      // 添加 AI 消息，立即显示文本
      setMessages((prev) => [...prev, reply]);

      // 立即恢复 idle 状态，让用户可以继续输入
      setConversationState('idle');

      // 后台异步播放语音，不阻塞界面
      // 注意：Safari 需要用户交互才能播放音频
      if (isAudioUnlocked()) {
        setIsPlayingAudio(true);
        speakText({
          text: reply.content,
          lang: 'en-US',
          speaker: 'B', // 女声
          speed: 1.0,   // 提高语速
        }).catch(console.error).finally(() => {
          setIsPlayingAudio(false);
        });
      }
      // 如果音频未解锁，用户需要点击播放按钮

    } catch (error) {
      toast.error('发送失败');
      setConversationState('idle');
      setIsPlayingAudio(false);
    }
  };

  // 播放指定消息
  const playMessage = async (message: SpeakMessage) => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }

    // 解锁音频播放（Safari 需要）
    unlockAudio();

    setIsPlayingAudio(true);
    try {
      await speakText({
        text: message.content,
        lang: 'en-US',
        speaker: 'B',
        speed: 1.0,
      });
    } catch (error) {
      toast.error('播放失败');
    }
    setIsPlayingAudio(false);
  };

  // 文本输入发送
  const handleTextSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim());
    }
  };

  // 结束对话
  const handleEndConversation = async () => {
    setEndingConversation(true);
    try {
      const result = await speakApi.endConversation(conversationId!);
      setFeedback(result.feedback);
      // 重新加载对话以获取更新后的消息
      await loadConversation();
    } catch (error) {
      toast.error('生成反馈失败');
    } finally {
      setEndingConversation(false);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取状态提示
  const getStateText = () => {
    switch (conversationState) {
      case 'thinking':
        return 'AI 思考中...';
      case 'speaking':
        return 'AI 正在说话...';
      case 'listening':
        return '正在聆听...';
      default:
        return '';
    }
  };

  // 根据用户消息内容查找相关的语法错误
  const getGrammarErrorForMessage = (messageContent: string): GrammarError | undefined => {
    if (!feedback) return undefined;
    if (!feedback.grammarErrors) return undefined;
    return feedback.grammarErrors.find(error => {
      // 精确匹配或包含匹配
      if (messageContent === error.userSentence) return true;
      if (messageContent.includes(error.userSentence)) return true;
      if (error.userSentence.includes(messageContent)) return true;
      // 模糊匹配：去除标点后比较
      const normalizeMsg = messageContent.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();
      const normalizeErr = error.userSentence.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();
      return normalizeMsg === normalizeErr || normalizeMsg.includes(normalizeErr) || normalizeErr.includes(normalizeMsg);
    });
  };

  // 根据用户消息内容查找相关的更好表达
  const getBetterExpressionForMessage = (messageContent: string): BetterExpression | undefined => {
    if (!feedback) return undefined;
    if (!feedback.betterExpressions) return undefined;
    return feedback.betterExpressions.find(expr => {
      if (messageContent === expr.userSentence) return true;
      if (messageContent.includes(expr.userSentence)) return true;
      if (expr.userSentence.includes(messageContent)) return true;
      const normalizeMsg = messageContent.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();
      const normalizeExpr = expr.userSentence.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();
      return normalizeMsg === normalizeExpr || normalizeMsg.includes(normalizeExpr) || normalizeExpr.includes(normalizeMsg);
    });
  };

  // 根据用户消息内容查找相关的正向鼓励
  const getGoodExpressionForMessage = (messageContent: string): GoodExpression | undefined => {
    if (!feedback || !feedback.goodExpressions) return undefined;
    return feedback.goodExpressions.find(expr => {
      if (messageContent === expr.userSentence) return true;
      if (messageContent.includes(expr.userSentence)) return true;
      if (expr.userSentence.includes(messageContent)) return true;
      const normalizeMsg = messageContent.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();
      const normalizeExpr = expr.userSentence.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();
      return normalizeMsg === normalizeExpr || normalizeMsg.includes(normalizeExpr) || normalizeExpr.includes(normalizeMsg);
    });
  };

  // 调试：输出 feedback 数据
  useEffect(() => {
    if (feedback) {
      console.log('[SpeakConversation] feedback:', {
        grammarErrors: feedback.grammarErrors?.length || 0,
        betterExpressions: feedback.betterExpressions?.length || 0,
        goodExpressions: feedback.goodExpressions?.length || 0,
        raw: feedback
      });
    }
  }, [feedback]);

  // 渲染带生词高亮的文本（仅用于 AI 消息）
  const renderHighlightedText = (text: string) => {
    if (!conversation?.words || conversation.words.length === 0) {
      return text;
    }

    // 创建生词集合（小写，用于匹配）
    const wordSet = new Set(conversation.words.map(w => w.toLowerCase()));

    // 使用正则匹配单词边界
    const parts = text.split(/(\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b)/g);

    return parts.map((part, i) => {
      // 检查是否是生词（忽略大小写）
      if (wordSet.has(part.toLowerCase())) {
        return (
          <span key={i} className="text-blue-600 font-semibold bg-blue-50 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="size-10 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">加载对话...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center py-20">
          <p className="text-gray-600">对话不存在</p>
          <Button className="mt-4" onClick={() => navigate('/speak')}>返回场景选择</Button>
        </div>
      </div>
    );
  }

  // 检查对话是否已结束
  const isConversationEnded = !!feedback;

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl h-screen flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <Button variant="ghost" onClick={() => navigate('/speak/history')}>
          <ArrowLeft className="size-4 mr-2" />
          返回
        </Button>
        <div className="text-center">
          <h1 className="font-medium">{conversation.scenarioName}</h1>
          <p className="text-xs text-gray-500">
            {conversation.difficulty === 'beginner' ? '初级' : conversation.difficulty === 'intermediate' ? '中级' : '高级'}
          </p>
        </div>
        {!isConversationEnded && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndConversation}
            disabled={endingConversation || messages.length < 2}
          >
            {endingConversation ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                正在生成反馈报告...
              </>
            ) : '结束对话'}
          </Button>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => {
          if (message.role === 'user') {
            const grammarError = getGrammarErrorForMessage(message.content);
            const betterExpression = getBetterExpressionForMessage(message.content);
            const goodExpression = getGoodExpressionForMessage(message.content);

            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%]">
                  {/* 用户消息 */}
                  <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3">
                    <p className="leading-relaxed">{message.content}</p>
                  </div>

                  {/* 反馈区域 - 显示在用户消息下方 */}
                  {(grammarError || betterExpression || goodExpression) && (
                    <div className="mt-2 space-y-2">
                      {/* 语法纠错 */}
                      {grammarError && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-1 text-orange-600 font-medium mb-2">
                            <AlertCircle className="size-4" />
                            语法纠错
                          </div>
                          <p className="text-red-600 line-through mb-1">❌ {grammarError.userSentence}</p>
                          <p className="text-green-600 mb-1">✅ {grammarError.correctedSentence}</p>
                          <p className="text-gray-500 text-xs">{grammarError.explanation}</p>
                        </div>
                      )}

                      {/* 更好的表达 */}
                      {betterExpression && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-1 text-blue-600 font-medium mb-2">
                            <Sparkles className="size-4" />
                            更好的表达
                          </div>
                          <p className="text-gray-500 mb-1">你说: "{betterExpression.userSentence}"</p>
                          <p className="text-blue-600 mb-1">建议: "{betterExpression.suggestedExpression}"</p>
                          <p className="text-gray-400 text-xs">{betterExpression.reason}</p>
                        </div>
                      )}

                      {/* 说得好的句子 */}
                      {goodExpression && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-1 text-green-600 font-medium mb-2">
                            <span className="text-base">👍</span>
                            说得很好
                          </div>
                          <p className="text-green-700">{goodExpression.praise}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // AI 消息
          return (
            <div key={message.id} className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => playMessage(message)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
                    title={isPlayingAudio ? '停止播放' : '播放语音'}
                  >
                    {isPlayingAudio ? (
                      <VolumeX className="size-4" />
                    ) : (
                      <Volume2 className="size-4" />
                    )}
                    <span className="text-xs">播放</span>
                  </button>
                  <span className="text-xs text-gray-500">AI</span>
                </div>
                <p className="leading-relaxed">{renderHighlightedText(message.content)}</p>
              </div>
            </div>
          );
        })}

        {/* 对话完成 - 开始新练习按钮 */}
        {isConversationEnded && feedback && (
          <div className="flex justify-center py-4">
            <Button onClick={() => navigate('/speak')}>
              开始新练习
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 状态提示 */}
      {(conversationState !== 'idle' || isPlayingAudio) && !isFreeTalkMode && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-600">
            {conversationState === 'thinking' ? 'AI 思考中...' :
             isPlayingAudio ? '正在播放语音...' :
             conversationState === 'listening' ? '正在聆听...' : ''}
          </span>
        </div>
      )}

      {/* 输入区域 */}
      {!isConversationEnded && (
        <div className="border-t pt-4">
          {/* 文本输入 - 自由对话模式下隐藏 */}
          {!isFreeTalkMode && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSend()}
                placeholder="输入文字进行对话"
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={conversationState !== 'idle'}
              />
              <Button onClick={handleTextSend} disabled={!inputText.trim() || conversationState !== 'idle'}>
                发送
              </Button>
            </div>
          )}

          {/* 自由对话模式状态提示 */}
          {isFreeTalkMode && (
            <div className={`mb-4 p-3 rounded-lg text-center ${
              freeTalkCountdown !== null
                ? 'bg-orange-50 border border-orange-200'
                : freeTalkStatus === 'processing'
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              {freeTalkCountdown !== null ? (
                <div className="flex items-center justify-center gap-2 text-orange-600">
                  <AlertCircle className="size-5" />
                  <span className="font-medium">{freeTalkCountdown}秒后将自动发送当前语音</span>
                </div>
              ) : freeTalkStatus === 'processing' ? (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="size-5 animate-spin" />
                  <span>AI 正在思考...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Mic className="size-5" />
                  <span>正在聆听，请说话...</span>
                </div>
              )}
              {inputText && (
                <p className="mt-2 text-gray-600 text-sm bg-white rounded p-2">
                  {inputText}
                </p>
              )}
            </div>
          )}

          {/* 按钮区域 */}
          <div className="flex justify-center gap-4">
            {/* 按住说话按钮 - 自由对话模式下隐藏 */}
            {!isFreeTalkMode && (
              <button
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all ${
                  recordingState === 'recording'
                    ? 'bg-red-500 text-white scale-110'
                    : recordingState === 'processing'
                    ? 'bg-gray-400 text-white'
                    : conversationState !== 'idle' || endingConversation
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                onMouseDown={handleRecordingStart}
                onMouseUp={handleRecordingEnd}
                onMouseLeave={handleRecordingEnd}
                onTouchStart={handleRecordingStart}
                onTouchEnd={handleRecordingEnd}
                disabled={conversationState !== 'idle' || endingConversation}
              >
                {recordingState === 'recording' ? (
                  <>
                    <Square className="size-6 mb-1" />
                    <span className="text-xs">{formatTime(recordingTime)}</span>
                  </>
                ) : recordingState === 'processing' ? (
                  <>
                    <Loader2 className="size-6 animate-spin mb-1" />
                    <span className="text-xs">识别中</span>
                  </>
                ) : (
                  <>
                    <Mic className="size-6 mb-1" />
                    <span className="text-xs">按住说话</span>
                  </>
                )}
              </button>
            )}

            {/* 自由对话按钮 */}
            <button
              className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all ${
                isFreeTalkMode
                  ? 'bg-green-500 text-white'
                  : conversationState !== 'idle' || endingConversation || !speechSupported
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
              onClick={isFreeTalkMode ? stopFreeTalkMode : startFreeTalkMode}
              disabled={conversationState !== 'idle' || endingConversation || !speechSupported}
            >
              {isFreeTalkMode ? (
                <>
                  <PhoneOff className="size-6 mb-1" />
                  <span className="text-xs">结束</span>
                </>
              ) : (
                <>
                  <Phone className="size-6 mb-1" />
                  <span className="text-xs">自由对话</span>
                </>
              )}
            </button>
          </div>

          {/* 提示文字 */}
          <div className="text-center mt-4">
            {isFreeTalkMode ? (
              <p className="text-sm text-green-600">
                自由对话模式已开启，像打电话一样和 AI 聊天吧
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                输入文字、按住说话或点击自由对话
              </p>
            )}
            {!speechSupported && (
              <p className="text-xs text-orange-500 mt-1">
                您的浏览器不支持语音识别，请使用文本输入
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
