<template>
  <div class="app-layout">
    <Sidebar />
    
    <main class="main-content">
      <TopHeader />
      
      <div class="view-container">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import Sidebar from './components/layout/Sidebar.vue'
import TopHeader from './components/layout/TopHeader.vue'
// 注意：这里不需要再 import Dashboard 了，路由会接管一切
</script>

<style>
:root {
  --bg-base: #0a0a0f;
  --bg-sidebar: #0f0f1a;
  --bg-card: #16162a;
  --bg-card-hover: #1e1e3a;
  --bg-hover: #252545;
  --bg-input: rgba(255,255,255,0.05);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --primary: #8b5cf6;
  --primary-hover: #7c3aed;
  --primary-glow: rgba(139, 92, 246, 0.4);
  --accent: #06b6d4;
  --accent-glow: rgba(6, 182, 212, 0.4);
  --success: #10b981;
  --success-glow: rgba(16, 185, 129, 0.4);
  --warning: #f59e0b;
  --danger: #ef4444;
  --sidebar-width: 250px;
  --header-height: 65px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(139, 92, 246, 0.2);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.4);
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  background: linear-gradient(135deg, var(--bg-base) 0%, #0d0d1a 50%, #0a0a15 100%);
  color: var(--text-main);
  overflow-x: hidden;
  min-height: 100vh;
}

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.03) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.app-layout {
  display: flex;
  height: 100vh;
  position: relative;
  z-index: 1;
}

.main-content {
  margin-left: var(--sidebar-width);
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(10px);
}

.view-container {
  flex: 1;
  overflow-y: auto;
  position: relative;
  padding: 0;
}

/* 页面切换动画 */
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

/* 玻璃拟态效果 */
.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* 发光效果 */
.glow-primary {
  box-shadow: var(--shadow-glow);
}

/* 渐变文字 */
.gradient-text {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 按钮基础样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--primary-glow);
}

.btn-secondary {
  background: var(--bg-input);
  color: var(--text-main);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background: var(--bg-hover);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-outline {
  background: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
}

.btn-outline:hover {
  background: var(--primary);
  color: white;
}

/* 卡片基础样式 */
.card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.card:hover {
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: var(--shadow-md);
}
</style>