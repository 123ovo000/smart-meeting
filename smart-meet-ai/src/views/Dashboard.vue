<template>
  <div class="dashboard-layout">
    <!-- 主内容区：左侧视频 + 右侧亮点轴 -->
    <div class="dashboard-main">
      <div class="dashboard-left">
        <!-- 视频播放（已集成表情识别） -->
        <div class="hero-video-section">
          <VideoPlayer :video="currentVideo" @play-video="playVideo" @emotion-update="onEmotionUpdate" />
          <RecommendedVideos :videos="uploadedVideos" @select-video="selectVideo" />
        </div>
      </div>

      <div class="dashboard-right">
        <HighlightsTimeline />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import VideoPlayer from '../components/dashboard/VideoPlayer.vue'
import RecommendedVideos from '../components/dashboard/RecommendedVideos.vue'
import HighlightsTimeline from '../components/dashboard/HighlightsTimeline.vue'
import { uploadedVideos, currentVideo, loadVideos } from '../services/videoService'

// 播放视频
const playVideo = (video) => {
  currentVideo.value = video
}

// 选择视频
const selectVideo = (video) => {
  currentVideo.value = video
}

// 表情更新回调
const onEmotionUpdate = (data) => {
  console.log('Emotion update:', data)
}

onMounted(async () => {
  await loadVideos()
  if (uploadedVideos.value.length > 0) {
    currentVideo.value = uploadedVideos.value[0]
  }
})
</script>

<style scoped>
.dashboard-layout {
  padding: 1.5rem;
  max-width: 1700px;
  margin: 0 auto;
}

.dashboard-main {
  display: flex;
  gap: 1.8rem;
  align-items: flex-start;
}

.dashboard-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
}

.dashboard-right {
  width: 400px;
  flex-shrink: 0;
}

.hero-video-section {
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text-main), var(--text-muted));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--text-dim);
  margin-top: 0.3rem;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 1.2rem 1.5rem;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover {
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.stat-icon.blue {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.stat-icon.purple {
  background: rgba(139, 92, 246, 0.15);
  color: var(--primary);
}

.stat-icon.green {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
}

.stat-icon.orange {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.2rem;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-dim);
}

@media (max-width: 1200px) {
  .dashboard-main {
    flex-direction: column;
  }
  .dashboard-right {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .dashboard-layout {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>