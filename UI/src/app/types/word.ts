// 单词相关类型定义

export interface Sentence {
  en: string;
  zh: string;
}

export interface Synonym {
  word: string;
  difference: string;
  example: string;
}

export interface Word {
  id: string;
  word: string;
  phoneticUs: string;
  phoneticUk: string;
  chineseDefinition: string;
  englishDefinition: string;
  partOfSpeech?: string;
  sentences: Sentence[];
  synonyms: Synonym[];
  antonyms?: string[];  // 反义词列表
  audioUs?: string;
  audioUk?: string;
  createdAt: string;
  lastReviewedAt: string | null;
  reviewCount: number;
}

export interface CreateWordRequest {
  word: string;
}

export interface WordListQuery {
  search?: string;
  sortBy?: 'createdAt' | 'lastReviewedAt';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// 词典 API 返回的丰富数据
export interface DictionaryData {
  phoneticUs: string;
  phoneticUk: string;
  audioUs?: string;
  audioUk?: string;
  englishDefinition: string;
  partOfSpeech?: string;
  sentences: Sentence[];  // API 自带的例句（可能无翻译）
  synonyms: string[];     // API 自带的同义词列表
  antonyms?: string[];
}
