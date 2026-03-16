// API 服务首页
export default function HomePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>EasyWords API Server</h1>
      <p>后端服务运行中...</p>
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
        <li>GET /api/settings - 获取设置状态</li>
        <li>POST /api/settings/api-key - 保存 API Key</li>
        <li>DELETE /api/settings/api-key - 删除 API Key</li>
        <li>POST /api/settings/verify - 验证 API Key</li>
      </ul>
    </div>
  )
}
