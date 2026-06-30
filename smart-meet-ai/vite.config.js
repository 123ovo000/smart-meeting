// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // 将所有 /api 开头的请求代理到后端
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false, // 允许自签名证书（本地开发可忽略）
        rewrite: (path) => path.replace(/^\/api/, '/api') // 可选：保持路径不变
      }
    }
  }
})