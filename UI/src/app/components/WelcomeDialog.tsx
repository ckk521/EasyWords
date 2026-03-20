import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { BookOpen, Library, FileText, Sparkles } from 'lucide-react';

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('easywords_welcome_seen');
    if (!hasSeenWelcome) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('easywords_welcome_seen', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <BookOpen className="size-6 text-blue-600" />
            欢迎使用 EasyWords
          </DialogTitle>
          <DialogDescription className="text-base">
            通过在真实语境中阅读来复习单词，让学习更有效
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="size-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium mb-1">1. 查词并保存</h4>
              <p className="text-sm text-gray-600">
                在首页输入单词，查看详细释义、例句和近义词，保存到生词本
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Library className="size-4 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium mb-1">2. 选词复习</h4>
              <p className="text-sm text-gray-600">
                在生词本中手动选择或使用"推荐"功能，选出需要复习的单词
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <FileText className="size-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium mb-1">3. 生成文章阅读</h4>
              <p className="text-sm text-gray-600">
                选择内容类型（新闻/故事）和长度，生成包含生词的文章，在语境中复习
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Sparkles className="size-4 text-orange-600" />
            </div>
            <div>
              <h4 className="font-medium mb-1">提示</h4>
              <p className="text-sm text-gray-600">
                我们已经为您准备了3个示例单词，您可以直接到生词本体验完整流程！
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>
            开始使用
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
