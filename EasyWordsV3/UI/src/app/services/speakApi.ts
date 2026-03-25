// V3.0 AI 口语陪练模块 - API 服务
import { toast } from 'sonner';
import {
  SpeakScenario,
  SpeakConversation,
  SpeakMessage,
  Feedback,
  Difficulty,
  ConversationMode,
} from '../types/speak';

// API 基础地址配置（与 api.ts 保持一致）
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 场景列表响应
interface ScenariosResponse {
  scenarios: SpeakScenario[];
}

// 对话列表响应
interface ConversationsResponse {
  conversations: SpeakConversation[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalDuration: number;
    totalFeedback: number;
  };
}

// 创建对话请求
interface CreateConversationRequest {
  scenarioId: string;
  difficulty: Difficulty;
  mode: ConversationMode;
  wordIds?: string[];
}

// 发送消息响应
interface SendMessageResponse {
  reply: SpeakMessage;
  words?: string[]; // 本次对话使用的生词
}

// 结束对话响应
interface EndConversationResponse {
  feedback: Feedback;
  duration: number;
}

// 获取带认证的请求头
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// 通用请求函数（带认证）
async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  // 处理 401 未授权响应
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    if (window.location.pathname !== '/login') {
      toast.error('请先登录');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
    throw new Error('请先登录');
  }

  // 处理 403 禁止访问响应（账号过期或被禁用）
  if (response.status === 403) {
    const responseText = await response.text();
    let errorMessage = '账号无权限';
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorData.error || '账号无权限';
    } catch {
      // 忽略解析错误
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    if (window.location.pathname !== '/login') {
      toast.error(errorMessage);
      sessionStorage.setItem('login_error', errorMessage);
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
    throw new Error(errorMessage);
  }

  // 先获取响应文本，再尝试解析 JSON
  const responseText = await response.text();

  let result: ApiResponse<T>;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    console.error('JSON 解析失败，响应内容:', responseText.substring(0, 500));
    throw new Error('服务器响应格式错误');
  }

  if (!result.success) {
    throw new Error(result.message || result.error || '请求失败');
  }

  return result.data as T;
}

// API 服务
export const speakApi = {
  // 获取场景列表
  async getScenarios(): Promise<SpeakScenario[]> {
    const result = await request<ScenariosResponse>('/speak/scenarios');
    return result.scenarios;
  },

  // 创建对话
  async createConversation(req: CreateConversationRequest): Promise<SpeakConversation> {
    return request<SpeakConversation>('/speak/conversations', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  // 获取对话列表
  async getConversations(page = 1, pageSize = 20): Promise<ConversationsResponse> {
    return request<ConversationsResponse>(
      `/speak/conversations?page=${page}&pageSize=${pageSize}`
    );
  },

  // 获取单个对话
  async getConversation(id: string): Promise<SpeakConversation> {
    return request<SpeakConversation>(`/speak/conversations/${id}`);
  },

  // 发送消息
  async sendMessage(conversationId: string, text: string): Promise<{ reply: SpeakMessage; words?: string[] }> {
    const result = await request<SendMessageResponse>(
      `/speak/conversations/${conversationId}/message`,
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      }
    );
    return { reply: result.reply, words: result.words };
  },

  // 结束对话
  async endConversation(conversationId: string): Promise<EndConversationResponse> {
    return request<EndConversationResponse>(
      `/speak/conversations/${conversationId}/end`,
      {
        method: 'POST',
      }
    );
  },

  // 删除对话
  async deleteConversation(id: string): Promise<void> {
    await request<{ message: string }>(`/speak/conversations/${id}`, {
      method: 'DELETE',
    });
  },
};
