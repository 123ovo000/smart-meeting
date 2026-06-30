<template>
  <aside class="sidebar">
    <div class="logo-area">
      <div class="logo-icon">
        <i class="fas fa-brain"></i>
      </div>
      <span class="logo-text">SmartMeet AI</span>
    </div>
    
    <nav class="nav-menu">
      <router-link to="/dashboard" class="nav-item">
        <div class="nav-icon">
          <i class="fas fa-compass"></i>
        </div>
        <span class="nav-text">探索大盘</span>
        <div class="nav-indicator"></div>
      </router-link>
      <router-link to="/meetings" class="nav-item">
        <div class="nav-icon">
          <i class="fas fa-video"></i>
        </div>
        <span class="nav-text">全部会议</span>
        <div class="nav-indicator"></div>
      </router-link>
      <router-link to="/analysis" class="nav-item">
        <div class="nav-icon">
          <i class="fas fa-chart-line"></i>
        </div>
        <span class="nav-text">数据分析</span>
        <div class="nav-indicator"></div>
      </router-link>
      
      <div class="divider"></div>
      <p class="nav-label">我的资产</p>
      
      <router-link to="/starred" class="nav-item">
        <div class="nav-icon">
          <i class="fas fa-bookmark"></i>
        </div>
        <span class="nav-text">星标片段</span>
        <div class="nav-indicator"></div>
      </router-link>
      <router-link to="/tasks" class="nav-item">
        <div class="nav-icon">
          <i class="fas fa-tasks"></i>
        </div>
        <span class="nav-text">待办追踪</span>
        <div class="nav-indicator"></div>
      </router-link>
      <router-link to="/upload" class="nav-item upload-item">
        <div class="nav-icon upload-icon">
          <i class="fas fa-upload"></i>
        </div>
        <span class="nav-text">本地上传</span>
        <div class="nav-indicator"></div>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="user-profile">
        <div class="avatar">
          <i class="fas fa-user"></i>
        </div>
        <div class="user-info">
          <p class="user-name">用户</p>
          <p class="user-role">管理员</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: linear-gradient(180deg, var(--bg-sidebar) 0%, rgba(15, 15, 26, 0.95) 100%);
  backdrop-filter: blur(20px);
  height: 100vh;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255,255,255,0.05);
  position: fixed;
  z-index: 100;
  box-shadow: 4px 0 30px rgba(0, 0, 0, 0.3), inset -1px 0 0 rgba(255,255,255,0.03);
}

.logo-area {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--text-main);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), transparent);
  position: relative;
}

.logo-area::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  box-shadow: 0 4px 20px var(--primary-glow);
  animation: logoPulse 3s ease-in-out infinite;
}

@keyframes logoPulse {
  0%, 100% {
    box-shadow: 0 4px 20px var(--primary-glow), 0 0 0 0 rgba(139, 92, 246, 0.4);
  }
  50% {
    box-shadow: 0 6px 25px var(--primary-glow), 0 0 0 10px rgba(139, 92, 246, 0);
  }
}

.logo-icon i { 
  color: white; 
  font-size: 1.3rem; 
}

.nav-menu { 
  padding: 1.5rem 1rem; 
  flex: 1; 
  overflow-y: auto; 
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.nav-menu::-webkit-scrollbar {
  width: 4px;
}

.nav-menu::-webkit-scrollbar-track {
  background: transparent;
}

.nav-menu::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}

.nav-item {
  display: flex; 
  align-items: center; 
  padding: 0.85rem 1rem;
  color: var(--text-muted); 
  text-decoration: none; 
  border-radius: var(--radius-md);
  margin-bottom: 0.3rem; 
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
  font-size: 0.92rem;
  position: relative;
  overflow: hidden;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: linear-gradient(180deg, var(--primary), var(--accent));
  border-radius: 0 3px 3px 0;
  transition: height 0.3s ease;
}

.nav-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  color: var(--text-muted);
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-main);
  transform: translateX(6px);
}

.nav-item:hover::before {
  height: 60%;
}

.nav-item:hover .nav-icon {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.2));
  color: var(--primary);
  transform: scale(1.1);
}

.nav-text {
  flex: 1;
  transition: all 0.3s ease;
}

.nav-indicator {
  width: 3px;
  height: 0;
  background: linear-gradient(180deg, var(--primary), var(--accent));
  border-radius: 0 3px 3px 0;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  transition: all 0.3s ease;
}

/* 当前路由状态 */
.router-link-active {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.05));
  color: var(--text-main);
  font-weight: 600;
}

.router-link-active::before {
  height: 70%;
}

.router-link-active .nav-indicator {
  height: 70%;
}

.router-link-active .nav-icon {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  box-shadow: 0 4px 12px var(--primary-glow);
}

/* 上传按钮特殊样式 */
.upload-item {
  margin-top: 0.5rem;
}

.upload-item .nav-icon {
  background: linear-gradient(135deg, var(--success), rgba(16, 185, 129, 0.7));
  color: white;
}

.upload-item:hover .nav-icon {
  box-shadow: 0 4px 16px var(--success-glow);
}

.divider { 
  margin: 16px 0; 
  border-top: 1px solid rgba(255,255,255,0.03);
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 1rem;
  right: 1rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.2), transparent);
}

.nav-label { 
  padding: 8px 15px; 
  font-size: 0.7rem; 
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

/* 侧边栏底部 */
.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255,255,255,0.05);
  margin-top: auto;
}

.user-profile {
  display: flex;
  align-items: center;
  padding: 0.7rem;
  border-radius: var(--radius-md);
  background: var(--bg-hover);
  transition: all 0.3s ease;
  cursor: pointer;
}

.user-profile:hover {
  background: var(--bg-card-hover);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}

.avatar i {
  color: white;
  font-size: 0.9rem;
}

.user-info {
  flex: 1;
  overflow: hidden;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 65px;
  }
  
  .logo-text {
    display: none;
  }
  
  .nav-text {
    display: none;
  }
  
  .nav-item {
    justify-content: center;
    padding: 0.85rem 0;
  }
  
  .nav-icon {
    margin-right: 0;
  }
  
  .nav-label {
    display: none;
  }
  
  .divider {
    margin: 12px 0;
  }
  
  .sidebar-footer {
    padding: 0.5rem;
  }
  
  .user-info {
    display: none;
  }
  
  .user-profile {
    justify-content: center;
    background: transparent;
  }
}
</style>