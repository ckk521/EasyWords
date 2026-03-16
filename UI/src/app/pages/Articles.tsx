import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { api } from '../services/api';
import { Loader2, BookOpen, ArrowRight, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ArticlePreview {
  id: string;
  title: string;
  type: 'news' | 'story';
  length: 'short' | 'medium' | 'long';
  createdAt: string;
  wordCount: number;
  words: Array<{ id: string; word: string }>;
  preview: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function Articles() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<ArticlePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 5, total: 0, totalPages: 0 });
  const PAGE_SIZE = 5;

  useEffect(() => {
    loadArticles(1);
  }, []);

  const loadArticles = async (page: number) => {
    setLoading(true);
    try {
      const data = await api.getArticles(page, PAGE_SIZE);
      setArticles(data.articles || []);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    loadArticles(newPage);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteArticle(id);
      toast.success('已删除');
      // 如果当前页删除后没有数据了，且不是第一页，则跳转到上一页
      if (articles.length === 1 && pagination.page > 1) {
        loadArticles(pagination.page - 1);
      } else {
        loadArticles(pagination.page);
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getTypeLabel = (type: string) => type === 'news' ? '新闻' : '故事';
  const getLengthLabel = (length: string) => {
    const map: Record<string, string> = { short: '短篇', medium: '中篇', long: '长篇' };
    return map[length] || length;
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();

    // 重置到当天0点进行比较
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.floor((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';

    // 其他情况显示具体日期
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    // 如果是今年，只显示月日；否则显示年月日
    if (year === now.getFullYear()) {
      return `${month}月${day}日`;
    }
    return `${year}年${month}月${day}日`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">
          我的文章
          <span className="text-lg font-normal text-gray-500 ml-3">
            共 {pagination.total} 篇
          </span>
        </h1>
        <Button onClick={() => navigate('/vocabulary')}>
          生成新文章
        </Button>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="size-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">还没有文章</p>
          <p className="text-sm mb-4">在生词本中选择单词生成文章</p>
          <Button onClick={() => navigate('/vocabulary')}>
            去生词本
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/reading?id=${article.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge>{getTypeLabel(article.type)}</Badge>
                    <Badge variant="outline">{getLengthLabel(article.length)}</Badge>
                    <Badge variant="outline">{article.wordCount} 个生词</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{getTimeAgo(article.createdAt)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(article.id, e)}
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                {article.title && (
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{article.title}</h3>
                )}

                <p className="text-gray-700 mb-4 line-clamp-2">{article.preview}</p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {article.words.slice(0, 5).map((w) => (
                      <span
                        key={w.id}
                        className="text-sm px-2 py-0.5 bg-blue-50 text-blue-700 rounded"
                      >
                        {w.word}
                      </span>
                    ))}
                    {article.words.length > 5 && (
                      <span className="text-sm text-gray-500">
                        +{article.words.length - 5}
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    阅读 <ArrowRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
              >
                <ChevronLeft className="size-4" />
                上一页
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => {
                    // 显示当前页附近的页码
                    const current = pagination.page;
                    return p === 1 || p === pagination.totalPages || Math.abs(p - current) <= 1;
                  })
                  .map((p, index, arr) => (
                    <span key={p}>
                      {index > 0 && arr[index - 1] !== p - 1 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <Button
                        variant={p === pagination.page ? "default" : "outline"}
                        size="sm"
                        className="min-w-[36px]"
                        onClick={() => handlePageChange(p)}
                        disabled={loading}
                      >
                        {p}
                      </Button>
                    </span>
                  ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages || loading}
              >
                下一页
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          {/* 分页信息 */}
          <div className="text-center text-sm text-gray-500 mt-4">
            共 {pagination.total} 篇文章，第 {pagination.page} / {pagination.totalPages} 页
          </div>
        </>
      )}
    </div>
  );
}
