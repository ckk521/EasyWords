/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // 允许跨域请求（开发环境）
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },

  // SPA 路由重写规则
  // 注意：需要先构建前端 (cd UI && pnpm build)
  async rewrites() {
    return {
      // 将前端路由重写到 index.html (SPA fallback)
      fallback: [
        {
          source: '/:path*',
          destination: '/index.html',
        },
      ],
    }
  },
}

module.exports = nextConfig
