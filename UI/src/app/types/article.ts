// 文章相关类型定义

export interface Article {
  id: string;
  title: string;
  content: string;
  wordIds: string[];
  type: 'news' | 'story';
  length: 'short' | 'medium' | 'long';
  topic?: string;
  translations: Record<string, string>;  // 段落索引 -> 翻译文本
  createdAt: string;
}

export interface GenerateArticleRequest {
  wordIds: string[];
  type: 'news' | 'story';
  length: 'short' | 'medium' | 'long';
  topic?: string;
}

export interface TranslateParagraphRequest {
  articleId: string;
  paragraphIndex: number;
  paragraph: string;
}
