// 根页面 - 服务前端应用
// 前端已构建到 public 目录，由 Next.js static files 服务
export default function HomePage() {
  // 重定向到前端应用
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="refresh" content="0;url=/index.html" />
        <title>EasyWords</title>
      </head>
      <body>
        <p>Redirecting to <a href="/index.html">EasyWords</a>...</p>
      </body>
    </html>
  )
}
