<template>
  <header class="top-header">
    <div class="header-left">
      <div class="tabs">
        <div 
          v-for="tab in tabs" 
          :key="tab"
          class="tab-item" 
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          <span class="tab-icon"><i class="fas fa-chart-line"></i></span>
          <span class="tab-text">{{ tab }}</span>
          <div class="tab-indicator"></div>
        </div>
      </div>
    </div>
    
    <div class="header-center">
      <div class="search-bar" :class="{ focused: isSearchFocused }">
        <i class="fas fa-search"></i>
        <input 
          type="text" 
          placeholder="搜索会议纪要或发言人..."
          class="search-input"
          @focus="isSearchFocused = true"
          @blur="isSearchFocused = false"
        >
        <button class="search-clear" v-if="isSearchFocused">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    
    <div class="header-right">
      <div class="action-buttons">
        <button class="action-btn" title="刷新">
          <i class="fas fa-refresh"></i>
        </button>
        <button class="action-btn notification-btn">
          <i class="fas fa-bell"></i>
          <span class="notification-dot"></span>
        </button>
        <button class="action-btn settings-btn">
          <i class="fas fa-cog"></i>
        </button>
      </div>
      
      <div class="user-profile">
        <div class="user-info">
          <p class="user-name">用户</p>
          <p class="user-status">在线</p>
        </div>
        <div class="user-avatar">
          <i class="fas fa-user"></i>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
const tabs = ['推荐复盘']
const activeTab = ref('推荐复盘')
const isSearchFocused = ref(false)
</script>

<style scoped>
.top-header {
  height: var(--header-height);
  display: flex; 
  align-items: center; 
  padding: 0 1.5rem;
  background: linear-gradient(180deg, rgba(15, 15, 26, 0.98) 0%, rgba(10, 10, 15, 0.95) 100%);
  backdrop-filter: blur(20px);
  position: sticky; 
  top: 0; 
  z-index: 50;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  box-shadow: 0 2px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
}

.header-left {
  flex: 1;
}

.tabs { 
  display: flex; 
  gap: 0.5rem;
  flex-shrink: 0;
}

.tab-item {
  color: var(--text-muted); 
  cursor: pointer; 
  font-weight: 500;
  position: relative; 
  padding: 0.6rem 1rem;
  border-radius: var(--radius-md);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-icon {
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.tab-text {
  transition: all 0.3s ease;
}

.tab-indicator {
  width: 0;
  height: 2.5px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 2px;
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-item:hover {
  color: var(--text-main);
  background: rgba(139, 92, 246, 0.1);
  transform: translateY(-1px);
}

.tab-item:hover .tab-icon {
  color: var(--primary);
}

.tab-item.active {
  color: var(--text-main);
  font-weight: 600;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.05));
}

.tab-item.active .tab-icon {
  color: var(--primary);
}

.tab-item.active .tab-indicator {
  width: 60%;
  box-shadow: 0 0 12px var(--primary-glow);
}

.header-center {
  flex: 2;
  display: flex;
  justify-content: center;
  padding: 0 2rem;
}

.search-bar {
  background: var(--bg-input);
  border-radius: var(--radius-lg);
  padding: 0.6rem 1.2rem;
  display: flex; 
  align-items: center;
  border: 1px solid rgba(255,255,255,0.08);
  transition: all 0.3s ease;
  position: relative;
  max-width: 400px;
  width: 100%;
}

.search-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.08), transparent);
  transition: left 0.6s ease;
}

.search-bar:hover::before {
  left: 100%;
}

.search-bar.focused {
  border-color: var(--primary);
  box-shadow: 0 0 25px var(--primary-glow);
  background: var(--bg-card);
}

.search-bar i {
  color: var(--text-dim);
  margin-right: 0.8rem;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.search-bar.focused i {
  color: var(--primary);
}

.search-input {
  background: transparent; 
  border: none; 
  color: var(--text-main);
  outline: none; 
  flex: 1;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.search-input::placeholder {
  color: var(--text-dim);
  transition: all 0.3s ease;
}

.search-input:focus::placeholder {
  color: rgba(148, 163, 184, 0.5);
}

.search-clear {
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-clear:hover {
  background: rgba(255,255,255,0.2);
  color: var(--text-main);
}

.header-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-main);
  border-color: rgba(255,255,255,0.15);
  transform: translateY(-1px);
}

.notification-btn {
  position: relative;
}

.notification-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: var(--danger);
  border-radius: 50%;
  animation: notificationPulse 2s ease-in-out infinite;
}

@keyframes notificationPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-profile:hover {
  background: var(--bg-hover);
  transform: translateY(-1px);
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.user-status {
  font-size: 0.7rem;
  color: var(--success);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-status::before {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--success);
  border-radius: 50%;
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  box-shadow: 0 4px 16px var(--primary-glow);
  transition: all 0.3s ease;
}

.user-profile:hover .user-avatar {
  box-shadow: 0 6px 20px var(--primary-glow);
  transform: scale(1.05);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .top-header {
    padding: 0 1rem;
  }
  
  .tabs {
    gap: 0.3rem;
  }
  
  .tab-item {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
  
  .tab-icon {
    display: none;
  }
  
  .header-center {
    padding: 0 0.5rem;
  }
  
  .search-bar {
    padding: 0.4rem 0.8rem;
  }
  
  .user-info {
    display: none;
  }
}
</style>