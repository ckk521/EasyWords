// 本地存储服务 - 模拟API后端
import { Word } from '../types/word';
import { Article } from '../types/article';

const WORDS_KEY = 'easywords_words';
const ARTICLES_KEY = 'easywords_articles';
const SETTINGS_KEY = 'easywords_settings';

export const storageService = {
  // 单词相关
  getWords(): Word[] {
    const data = localStorage.getItem(WORDS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveWords(words: Word[]): void {
    localStorage.setItem(WORDS_KEY, JSON.stringify(words));
  },

  getWordById(id: string): Word | undefined {
    const words = this.getWords();
    return words.find(w => w.id === id);
  },

  getWordByText(word: string): Word | undefined {
    const words = this.getWords();
    return words.find(w => w.word.toLowerCase() === word.toLowerCase());
  },

  addWord(word: Word): void {
    const words = this.getWords();
    words.unshift(word);
    this.saveWords(words);
  },

  deleteWord(id: string): void {
    const words = this.getWords().filter(w => w.id !== id);
    this.saveWords(words);
  },

  updateWord(id: string, updates: Partial<Word>): void {
    const words = this.getWords();
    const index = words.findIndex(w => w.id === id);
    if (index !== -1) {
      words[index] = { ...words[index], ...updates };
      this.saveWords(words);
    }
  },

  // 文章相关
  getArticles(): Article[] {
    const data = localStorage.getItem(ARTICLES_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveArticle(article: Article): void {
    const articles = this.getArticles();
    articles.unshift(article);
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
  },

  getArticleById(id: string): Article | undefined {
    const articles = this.getArticles();
    return articles.find(a => a.id === id);
  },

  // 设置相关
  getSettings(): { hasApiKey: boolean; apiProvider: string | null } {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      const settings = JSON.parse(data);
      return {
        hasApiKey: !!settings.apiKey,
        apiProvider: settings.apiProvider || null
      };
    }
    return { hasApiKey: false, apiProvider: null };
  },

  saveApiKey(apiKey: string): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ apiKey, apiProvider: 'zhipu' }));
  },

  getApiKey(): string | null {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data).apiKey : null;
  },

  deleteApiKey(): void {
    localStorage.removeItem(SETTINGS_KEY);
  }
};
