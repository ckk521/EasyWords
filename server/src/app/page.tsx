// 根页面 - 重定向到前端应用
// 生产环境：此页面会被 rewrite 到 index.html
// 开发环境：显示 API 文档
export default function HomePage() {
  // 检查是否在开发环境
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>EasyWords API Server (开发模式)</h1>
        <p>后端服务运行中...</p>
        <p>前端地址: <a href="http://localhost:5173">http://localhost:5173</a></p>
        <h2>可用接口:</h2>
        <ul>
          <li>POST /api/words/lookup - 查词</li>
          <li>GET /api/words - 获取单词列表</li>
          <li>POST /api/words - 添加单词</li>
          <li>GET /api/words/:id - 获取单词详情</li>
          <li>DELETE /api/words/:id - 删除单词</li>
          <li>POST /api/words/recommend - 推荐单词</li>
          <li>POST /api/words/review - 标记已复习</li>
          <li>POST /api/articles - 生成文章</li>
          <li>GET /api/articles/:id - 获取文章详情</li>
          <li>POST /api/dialogue - 生成对话</li>
          <li>GET /api/settings - 获取设置状态</li>
          <li>POST /api/settings/api-key - 保存 API Key</li>
        </ul>
      </div>
    )
  }

  // 生产环境：返回一个简单的加载页面（会被 rewrite 规则覆盖）
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>EasyWords</title>
      </head>
      <body>
        <div id="root">Loading...</div>
        <script>window.location.reload();</script>
      </body>
    </html>
  )
}
