import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 生产环境输出到 Next.js public 目录
  build: {
    outDir: path.resolve(__dirname, '../server/public'),
    emptyOutDir: true,
    sourcemap: false,
  },
  // 开发环境基础路径
  base: '/',
  // 生产环境资源路径 (同域部署，不需要额外路径)
  // assets 路径在 build 时自动处理
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // ============================================
  // 开发环境专用配置（生产构建时自动忽略）
  // ============================================
  server: {
    proxy: {
      // 本地开发时，将 /api 请求代理到后端
      // 生产环境：前后端同域部署，不需要代理
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
