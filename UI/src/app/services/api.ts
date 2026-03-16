// API服务 - 连接后端
import { Word, CreateWordRequest, WordListQuery, DictionaryData } from '../types/word';
import { Article, GenerateArticleRequest } from '../types/article';

// API 基础地址配置
// - 开发环境: 从环境变量读取，默认 http://localhost:3000/api
// - 生产环境: 使用相对路径 /api (前后端同域部署)
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// 统一响应格式
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API 配置类型
export interface ApiConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
}

// 设置状态类型
export interface SettingsStatus {
  hasApiKey: boolean;
  apiProvider: string | null;
  baseURL: string | null;
  model: string | null;
}

// 流式查词回调
export interface StreamCallbacks {
  onDictionaryData?: (data: DictionaryData | null) => void;
  onChunk?: (content: string) => void;
  onComplete?: (word: Word) => void;
  onError?: (error: string) => void;
}

// 封装 fetch 请求
async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

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

export const api = {
  // 查词（调用LLM）
  async lookupWord(word: string): Promise<Word> {
    return request<Word>('/words/lookup', {
      method: 'POST',
      body: JSON.stringify({ word }),
    });
  },

  // 快速查词（仅返回基本释义，用于长按查词）
  async quickLookup(word: string): Promise<{ chineseDefinition: string; phoneticUs: string }> {
    return request<{ chineseDefinition: string; phoneticUs: string }>('/words/quick-lookup', {
      method: 'POST',
      body: JSON.stringify({ word }),
    });
  },

  // 流式查词
  async lookupWordStream(word: string, callbacks: StreamCallbacks): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/words/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ word, stream: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        callbacks.onError?.(error.message || '请求失败');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError?.('无法获取响应流');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              switch (parsed.type) {
                case 'dictionary':
                  callbacks.onDictionaryData?.(parsed.data);
                  break;
                case 'chunk':
                  callbacks.onChunk?.(parsed.content);
                  break;
                case 'complete':
                  callbacks.onComplete?.({
                    id: `temp-${Date.now()}`,
                    word: word.toLowerCase(),
                    ...parsed.data,
                    createdAt: new Date().toISOString(),
                    lastReviewedAt: null,
                    reviewCount: 0,
                    isSaved: false,
                  });
                  break;
                case 'error':
                  callbacks.onError?.(parsed.message);
                  break;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error.message : '网络错误');
    }
  },

  // 添加单词到生词本（传递完整数据，秒级保存）
  async addWord(wordData: Omit<Word, 'id' | 'createdAt' | 'lastReviewedAt' | 'reviewCount'>): Promise<Word> {
    return request<Word>('/words', {
      method: 'POST',
      body: JSON.stringify(wordData),
    });
  },

  // 获取单词列表
  async getWords(params?: WordListQuery): Promise<{ words: Word[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const queryString = searchParams.toString();
    return request(`/words${queryString ? `?${queryString}` : ''}`);
  },

  // 获取单词详情
  async getWordById(id: string): Promise<Word> {
    return request<Word>(`/words/${id}`);
  },

  // 删除单词
  async deleteWord(id: string): Promise<void> {
    await request(`/words/${id}`, { method: 'DELETE' });
  },

  // 推荐单词
  async recommendWords(count: number = 10): Promise<Word[]> {
    return request<Word[]>('/words/recommend', {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  },

  // 标记已复习
  async markAsReviewed(wordIds: string[]): Promise<void> {
    await request('/words/review', {
      method: 'POST',
      body: JSON.stringify({ wordIds }),
    });
  },

  // 生成文章（非流式）
  async generateArticle(requestBody: GenerateArticleRequest): Promise<Article> {
    return request<Article>('/articles', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  },

  // 流式生成文章
  async generateArticleStream(
    requestBody: GenerateArticleRequest,
    callbacks: {
      onInfo?: (data: { words: string[]; type: string; length: string }) => void;
      onChunk?: (content: string) => void;
      onSaved?: (data: { id: string; wordIds: string[]; words: Array<{ id: string; word: string }>; type: string; length: string; createdAt: string }) => void;
      onError?: (error: string) => void;
    }
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ ...requestBody, stream: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        callbacks.onError?.(error.message || '请求失败');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError?.('无法获取响应流');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              switch (parsed.type) {
                case 'info':
                  callbacks.onInfo?.(parsed.data);
                  break;
                case 'chunk':
                  callbacks.onChunk?.(parsed.content);
                  break;
                case 'saved':
                  callbacks.onSaved?.(parsed.data);
                  break;
                case 'error':
                  callbacks.onError?.(parsed.message);
                  break;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error.message : '网络错误');
    }
  },

  // 获取文章详情
  async getArticle(id: string): Promise<Article & { words: Word[] }> {
    return request<Article & { words: Word[] }>(`/articles/${id}`);
  },

  // 翻译段落
  async translateParagraph(articleId: string, paragraphIndex: number, paragraph: string): Promise<{
    paragraphIndex: number;
    translation: string;
    translations: Record<string, string>;
  }> {
    return request(`/articles/${articleId}/translate`, {
      method: 'POST',
      body: JSON.stringify({ paragraphIndex, paragraph }),
    });
  },

  // 获取文章列表（支持分页）
  async getArticles(page: number = 1, pageSize: number = 5): Promise<{
    articles: Array<{
      id: string;
      type: string;
      length: string;
      createdAt: string;
      wordCount: number;
      words: Array<{ id: string; word: string }>;
      preview: string;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    return request(`/articles?page=${page}&pageSize=${pageSize}`);
  },

  // 删除文章
  async deleteArticle(id: string): Promise<void> {
    await request(`/articles/${id}`, { method: 'DELETE' });
  },

  // 设置相关
  async getSettings(): Promise<SettingsStatus> {
    return request('/settings');
  },

  async saveApiConfig(config: ApiConfig): Promise<void> {
    await request('/settings/api-key', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async deleteApiKey(): Promise<void> {
    await request('/settings/api-key', { method: 'DELETE' });
  },

  async verifyApiConfig(config: ApiConfig): Promise<boolean> {
    try {
      await request('/settings/verify', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      return true;
    } catch {
      return false;
    }
  },

  // 对话音频生成
  async generateDialogue(params: {
    words: string[];
    wordIds: string[];
    topic?: string;
  }): Promise<{
    id: string;
    wordIds: string[];
    words: string[];
    scene: string;
    topic?: string;
    dialogue: Array<{
      speaker: string;
      text: string;
    }>;
    duration: number;
    createdAt: string;
  }> {
    return request('/dialogue', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // 获取对话列表
  async getDialogues(page: number = 1, pageSize: number = 10): Promise<{
    dialogues: Array<{
      id: string;
      scene: string;
      topic?: string;
      words: string[];
      wordIds: string[];
      dialogue: Array<{
        speaker: string;
        text: string;
      }>;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    return request(`/dialogue?page=${page}&pageSize=${pageSize}`);
  },

  // 获取单个对话
  async getDialogue(id: string): Promise<{
    id: string;
    scene: string;
    topic?: string;
    words: string[];
    wordIds: string[];
    dialogue: Array<{
      speaker: string;
      text: string;
    }>;
    createdAt: string;
  }> {
    return request(`/dialogue/${id}`);
  },

  // 删除对话
  async deleteDialogue(id: string): Promise<void> {
    await request(`/dialogue/${id}`, { method: 'DELETE' });
  },
};
